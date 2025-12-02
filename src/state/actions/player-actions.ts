import { kmClient } from '@/services/km-client';
import { globalStore } from '../stores/global-store';
import { playerStore, type PlayerState } from '../stores/player-store';

type MoveDirection = 'left' | 'right' | 'idle';
const POSITION_STEP = 0.05;
const PLAYER_COLORS = [
	'#f97316',
	'#ec4899',
	'#8b5cf6',
	'#14b8a6',
	'#22c55e',
	'#0ea5e9',
	'#facc15',
	'#fb7185',
	'#38bdf8',
	'#34d399',
	'#f472b6',
	'#a3e635'
];

function sanitizeWeight(weight: number) {
	if (Number.isNaN(weight)) {
		return 0;
	}
	return Math.max(0, Math.min(500, Math.round(weight)));
}

function getPlayerColor(clientId: string) {
	let hash = 0;
	for (let index = 0; index < clientId.length; index += 1) {
		hash = (hash << 5) - hash + clientId.charCodeAt(index);
		hash |= 0;
	}
	const colorIndex = Math.abs(hash) % PLAYER_COLORS.length;
	return PLAYER_COLORS[colorIndex];
}

export const playerActions = {
	async setCurrentView(view: PlayerState['currentView']) {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = view;
		});
	},

	async setPendingDeploymentTimestamp(timestamp: number) {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.pendingDeploymentTimestamp = timestamp;
		});
	},

	async setPlayerProfile(name: string, weight: number) {
		const trimmedName = name.trim();
		const safeWeight = sanitizeWeight(weight);
		const now = kmClient.serverTimestamp();
		const clientId = kmClient.id ?? 'unknown';
		const playerColor = getPlayerColor(clientId);

		await kmClient.transact(
			[playerStore, globalStore],
			([playerState, globalState]) => {
				playerState.name = trimmedName;
				playerState.weight = safeWeight;
				if (playerState.currentView === 'lobby') {
					playerState.currentView = 'countdown';
				}

				const existing = globalState.players[clientId];
				if (existing) {
					existing.name = trimmedName;
					existing.weight = safeWeight;
					if (!existing.color) {
						existing.color = playerColor;
					}
				} else {
					globalState.players[clientId] = {
						name: trimmedName,
						weight: safeWeight,
						status: 'waiting',
						queuedAt: now,
						deployedAt: 0,
						position: 0,
						color: playerColor
					};
				}

				if (!globalState.deploymentQueue.includes(clientId)) {
					globalState.deploymentQueue.push(clientId);
				}

				const queueIndex = globalState.deploymentQueue.indexOf(clientId);
				const baseTimestamp =
					globalState.nextDeploymentAt ||
					globalState.startTimestamp ||
					now;
				const predictedTimestamp =
					baseTimestamp + queueIndex * globalState.deploymentIntervalMs;
				playerState.pendingDeploymentTimestamp = predictedTimestamp;
			}
		);
	},

	async nudgeBeamPosition(direction: MoveDirection) {
		if (direction === 'idle') return;

		await kmClient.transact([globalStore, playerStore], ([globalState, playerState]) => {
			const clientId = kmClient.id ?? 'unknown';
			const player = globalState.players[clientId];
			if (!player || player.status !== 'deployed') {
				return;
			}

			const delta = direction === 'left' ? -POSITION_STEP : POSITION_STEP;
			player.position = Math.max(-1, Math.min(1, player.position + delta));
			playerState.lastKnownPosition = player.position;
		});
	}
};
