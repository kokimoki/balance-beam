import { config } from '@/config';
import { kmClient } from '@/services/km-client';
import {
	ASSIGNMENT_DEFINITION_MAP,
	CENTER_THIRD_THRESHOLD,
	SWAP_MIN_DISTANCE,
	createAssignmentsState,
	type AssignmentDefinition,
	type AssignmentId,
	type AssignmentProgress
} from '@/state/assignments';
import { globalStore } from '../stores/global-store';
import type { GlobalState } from '../stores/global-store';

const MIN_INTERVAL_MS = 3000;
const MAX_INTERVAL_MS = 60000;
const MIN_PHYSICS_MULTIPLIER = 0.25;
const MAX_PHYSICS_MULTIPLIER = 3;
const MIN_EFFECTIVE_INERTIA = 25;
const ANGULAR_DAMPING_PER_SECOND = 0.12; // light friction to prevent runaway spinning

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

export const globalActions = {
	async assignController(connectionId: string, heartbeat: number) {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.controllerConnectionId = connectionId;
			globalState.controllerHeartbeat = heartbeat;
		});
	},

	async updateControllerHeartbeat(timestamp: number) {
		await kmClient.transact([globalStore], ([globalState]) => {
			if (globalState.controllerConnectionId === kmClient.connectionId) {
				globalState.controllerHeartbeat = timestamp;
			}
		});
	},

	async startGame() {
		const now = kmClient.serverTimestamp();
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.started = true;
			globalState.startTimestamp = now;
			globalState.lastDeploymentTimestamp = now;
			globalState.nextDeploymentAt = now + globalState.deploymentIntervalMs;
			globalState.totalDeployed = 0;
			globalState.beam.angle = 0;
			globalState.beam.angularVelocity = 0;
			globalState.beam.lastUpdate = now;
			globalState.assignments = createAssignmentsState();
		});
	},

	async stopGame() {
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.started = false;
			globalState.startTimestamp = 0;
			globalState.lastDeploymentTimestamp = 0;
			globalState.nextDeploymentAt = 0;
			globalState.totalDeployed = 0;
			globalState.deploymentQueue = [];
			Object.values(globalState.players).forEach((player) => {
				player.status = 'waiting';
				player.deployedAt = 0;
				player.position = 0;
			});
			globalState.beam.angle = 0;
			globalState.beam.angularVelocity = 0;
			globalState.beam.lastUpdate = 0;
			globalState.assignments = createAssignmentsState();
		});
	},

	async setDeploymentInterval(intervalMs: number) {
		const clamped = clamp(intervalMs, MIN_INTERVAL_MS, MAX_INTERVAL_MS);
		const now = kmClient.serverTimestamp();
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.deploymentIntervalMs = clamped;
			if (globalState.started) {
				globalState.nextDeploymentAt = Math.max(
					now + clamped,
					globalState.lastDeploymentTimestamp + clamped
				);
			}
		});
	},

	async setPhysicsSpeedMultiplier(multiplier: number) {
		const clamped = clamp(multiplier, MIN_PHYSICS_MULTIPLIER, MAX_PHYSICS_MULTIPLIER);
		await kmClient.transact([globalStore], ([globalState]) => {
			globalState.physicsSpeedMultiplier = clamped;
		});
	},

	async deployNextQueuedPlayer(initialPosition: number) {
		const now = kmClient.serverTimestamp();
		await kmClient.transact([globalStore], ([globalState]) => {
			if (!globalState.started) {
				return;
			}

			const nextClientId = globalState.deploymentQueue.shift();
			if (!nextClientId) {
				globalState.nextDeploymentAt = now + globalState.deploymentIntervalMs;
				ensureAssignmentsUnlocked(globalState, now);
				return;
			}

			const player = globalState.players[nextClientId];
			if (!player) {
				return;
			}

			player.status = 'deployed';
			player.deployedAt = now;
			player.position = clamp(initialPosition, -1, 1);

			globalState.totalDeployed += 1;
			globalState.lastDeploymentTimestamp = now;
			globalState.nextDeploymentAt = now + globalState.deploymentIntervalMs;
			ensureAssignmentsUnlocked(globalState, now);
		});
	},

	async updateBeamPhysics(now: number) {
		await kmClient.transact([globalStore], ([globalState]) => {
			const lastUpdate = globalState.beam.lastUpdate || now;
			const deltaMs = Math.max(0, now - lastUpdate);
			if (deltaMs === 0) {
				return;
			}

			const deltaSeconds = (deltaMs / 1000) * globalState.physicsSpeedMultiplier;
			if (deltaSeconds <= 0) {
				globalState.beam.lastUpdate = now;
				return;
			}

			const deployedPlayers = Object.values(globalState.players).filter(
				(player) => player.status === 'deployed'
			);
			const angleRad = (globalState.beam.angle * Math.PI) / 180;
			let torque = 0;
			let inertia = 0;

			for (const player of deployedPlayers) {
				const position = clamp(player.position, -1, 1);
				torque += player.weight * position * Math.cos(angleRad);
				inertia += Math.abs(player.weight * position * position);
			}

			const effectiveInertia = Math.max(inertia, MIN_EFFECTIVE_INERTIA);
			const angularAcceleration = torque / effectiveInertia;
			globalState.beam.angularVelocity += angularAcceleration * deltaSeconds;

			const damping = Math.exp(-ANGULAR_DAMPING_PER_SECOND * deltaSeconds);
			globalState.beam.angularVelocity *= damping;
			globalState.beam.angle += globalState.beam.angularVelocity * deltaSeconds;
			globalState.beam.lastUpdate = now;
		});
	},

	async evaluateAssignments(now: number) {
		await kmClient.transact([globalStore], ([globalState]) => {
			runAssignmentsTick(globalState, now);
		});
	}
};

function runAssignmentsTick(globalState: GlobalState, now: number) {
	if (!globalState.started) {
		return;
	}

	ensureAssignmentsUnlocked(globalState, now);

	if (globalState.assignments.waitingForAllDeployed) {
		return;
	}

	const activeId = globalState.assignments.currentAssignmentId;
	if (!activeId) {
		return;
	}

	const progress = globalState.assignments.progress[activeId];
	const definition = ASSIGNMENT_DEFINITION_MAP[activeId];
	if (!progress || !definition) {
		return;
	}

	const requirementMet = evaluateAssignmentRequirement(definition, progress, globalState);
	if (!requirementMet) {
		progress.requirementMetAt = 0;
		progress.balanceHoldStartAt = 0;
		return;
	}

	if (!progress.requirementMetAt) {
		progress.requirementMetAt = now;
	}

	if (isAngleBalanced(globalState.beam.angle)) {
		if (!progress.balanceHoldStartAt) {
			progress.balanceHoldStartAt = now;
		} else if (now - progress.balanceHoldStartAt >= getBalanceHoldDurationMs()) {
			markAssignmentCompleted(globalState, progress, now);
		}
	} else {
		progress.balanceHoldStartAt = 0;
	}
}

function ensureAssignmentsUnlocked(globalState: GlobalState, now: number) {
	if (!globalState.started || !globalState.assignments.waitingForAllDeployed) {
		return;
	}

	const queueEmpty = globalState.deploymentQueue.length === 0;
	const deployedCount = getDeployedPlayers(globalState).length;
	const pendingPlayers = Object.values(globalState.players).some(
		(player) => player.status !== 'deployed'
	);

	if (queueEmpty && !pendingPlayers && deployedCount > 0) {
		globalState.assignments.waitingForAllDeployed = false;
		activateNextAssignment(globalState, now);
	}
}

function activateNextAssignment(globalState: GlobalState, now: number) {
	const { order, progress } = globalState.assignments;
	const nextId = order.find((id) => progress[id].status !== 'completed') || null;
	globalState.assignments.currentAssignmentId = nextId;
	if (!nextId) {
		return;
	}

	const assignment = progress[nextId];
	assignment.status = 'active';
	assignment.startedAt = now;
	assignment.completedAt = 0;
	assignment.durationMs = 0;
	assignment.requirementMetAt = 0;
	assignment.balanceHoldStartAt = 0;
	assignment.data = {};
	prepareAssignmentState(nextId, assignment, globalState);
}

function prepareAssignmentState(
	assignmentId: AssignmentId,
	progress: AssignmentProgress,
	globalState: GlobalState
) {
	const definition = ASSIGNMENT_DEFINITION_MAP[assignmentId];
	if (!definition) {
		return;
	}

	switch (definition.kind) {
		case 'swap':
			progress.data.initialSigns = Object.fromEntries(
				getDeployedPlayers(globalState).map(([id, player]) => [
					id,
					getPositionSign(player.position)
				])
			);
			break;
		case 'rotation':
			progress.data.lastAngle = globalState.beam.angle;
			progress.data.accumulatedRotation = 0;
			progress.data.rotationCompleted = false;
			progress.data.rotationTarget = definition.rotationTargetDegrees ?? 360;
			break;
		case 'touch':
			progress.data.hitTarget = false;
			progress.data.touchTarget = definition.touchTargetDegrees ?? 90;
			break;
		default:
			break;
	}
}

function evaluateAssignmentRequirement(
	definition: AssignmentDefinition,
	progress: AssignmentProgress,
	globalState: GlobalState
): boolean {
	switch (definition.kind) {
		case 'balance':
			return true;
		case 'positions':
			return arePlayersOutsideCenter(globalState);
		case 'swap':
			return havePlayersSwappedSides(progress, globalState);
		case 'rotation':
			return hasCompletedRotation(definition, progress, globalState);
		case 'touch':
			return hasTouchedAngle(definition, progress, globalState);
		default:
			return false;
	}
}

function arePlayersOutsideCenter(globalState: GlobalState) {
	const deployed = getDeployedPlayers(globalState);
	if (deployed.length === 0) {
		return false;
	}
	return deployed.every(([, player]) => Math.abs(player.position) >= CENTER_THIRD_THRESHOLD);
}

function havePlayersSwappedSides(progress: AssignmentProgress, globalState: GlobalState) {
	const deployed = getDeployedPlayers(globalState);
	if (deployed.length === 0) {
		return false;
	}
	const initialSigns = progress.data.initialSigns as Record<string, number> | undefined;
	if (!initialSigns) {
		return false;
	}

	for (const [id, player] of deployed) {
		const originalSign = initialSigns[id];
		if (typeof originalSign !== 'number') {
			return false;
		}
		const currentSign = getPositionSign(player.position);
		if (Math.abs(player.position) < SWAP_MIN_DISTANCE) {
			return false;
		}
		if (originalSign === 0) {
			if (currentSign === 0) {
				return false;
			}
			continue;
		}
		if (currentSign + originalSign !== 0) {
			return false;
		}
	}

	return true;
}

function hasCompletedRotation(
	definition: AssignmentDefinition,
	progress: AssignmentProgress,
	globalState: GlobalState
) {
	if (progress.data.rotationCompleted) {
		return true;
	}
	const target = (progress.data.rotationTarget as number) || definition.rotationTargetDegrees || 360;
	const lastAngle = (progress.data.lastAngle as number) ?? globalState.beam.angle;
	const accumulated = (progress.data.accumulatedRotation as number) ?? 0;
	const delta = globalState.beam.angle - lastAngle;
	const newAccumulated = accumulated + delta;
	progress.data.lastAngle = globalState.beam.angle;
	progress.data.accumulatedRotation = newAccumulated;
	if (Math.abs(newAccumulated) >= target) {
		progress.data.rotationCompleted = true;
		return true;
	}
	return false;
}

function hasTouchedAngle(
	definition: AssignmentDefinition,
	progress: AssignmentProgress,
	globalState: GlobalState
) {
	if (progress.data.hitTarget) {
		return true;
	}
	const target = (progress.data.touchTarget as number) || definition.touchTargetDegrees || 90;
	const normalized = Math.abs(normalizeAngle(globalState.beam.angle));
	if (normalized >= target) {
		progress.data.hitTarget = true;
		return true;
	}
	return false;
}

function markAssignmentCompleted(
	globalState: GlobalState,
	progress: AssignmentProgress,
	now: number
) {
	progress.status = 'completed';
	progress.completedAt = now;
	progress.durationMs = progress.startedAt ? now - progress.startedAt : 0;
	progress.balanceHoldStartAt = 0;
	globalState.assignments.currentAssignmentId = null;
	activateNextAssignment(globalState, now);
}

function isAngleBalanced(angle: number) {
	const tolerance = config.assignmentBalanceToleranceDegrees ?? 5;
	return Math.abs(normalizeAngle(angle)) <= tolerance;
}

function getBalanceHoldDurationMs() {
	return (config.assignmentBalanceHoldSeconds ?? 10) * 1000;
}

function normalizeAngle(angle: number) {
	let normalized = angle % 360;
	if (normalized > 180) {
		normalized -= 360;
	} else if (normalized < -180) {
		normalized += 360;
	}
	return normalized;
}

function getDeployedPlayers(globalState: GlobalState) {
	return Object.entries(globalState.players).filter(([, player]) => player.status === 'deployed');
}

function getPositionSign(position: number) {
	if (position >= SWAP_MIN_DISTANCE) {
		return 1;
	}
	if (position <= -SWAP_MIN_DISTANCE) {
		return -1;
	}
	return 0;
}
