import type { Config } from '@/config';

export type AssignmentId =
	| 'balance'
	| 'spread'
	| 'swap'
	| 'turn360'
	| 'touch90'
	| 'turn720';

export type AssignmentStatus = 'locked' | 'active' | 'completed';

export type AssignmentKind =
	| 'balance'
	| 'positions'
	| 'swap'
	| 'rotation'
	| 'touch';

export interface AssignmentDefinition {
	id: AssignmentId;
	kind: AssignmentKind;
	highlightCenterThird?: boolean;
	rotationTargetDegrees?: number;
	touchTargetDegrees?: number;
}

export const CENTER_THIRD_THRESHOLD = 1 / 3;
export const SWAP_MIN_DISTANCE = 0.15;

export const ASSIGNMENT_DEFINITIONS: AssignmentDefinition[] = [
	{ id: 'balance', kind: 'balance' },
	{ id: 'spread', kind: 'positions', highlightCenterThird: true },
	{ id: 'swap', kind: 'swap' },
	{ id: 'turn360', kind: 'rotation', rotationTargetDegrees: 360 },
	{ id: 'touch90', kind: 'touch', touchTargetDegrees: 90 },
	{ id: 'turn720', kind: 'rotation', rotationTargetDegrees: 720 }
];

export const ASSIGNMENT_DEFINITION_MAP = Object.fromEntries(
	ASSIGNMENT_DEFINITIONS.map((definition) => [definition.id, definition])
) as Record<AssignmentId, AssignmentDefinition>;

export const ASSIGNMENT_CONTENT_KEYS: Record<AssignmentId, {
	title: keyof Config;
	description: keyof Config;
}> = {
	balance: {
		title: 'assignmentBalanceTitle',
		description: 'assignmentBalanceDescriptionMd'
	},
	spread: {
		title: 'assignmentSpreadTitle',
		description: 'assignmentSpreadDescriptionMd'
	},
	swap: {
		title: 'assignmentSwapTitle',
		description: 'assignmentSwapDescriptionMd'
	},
	turn360: {
		title: 'assignmentTurn360Title',
		description: 'assignmentTurn360DescriptionMd'
	},
	touch90: {
		title: 'assignmentTouch90Title',
		description: 'assignmentTouch90DescriptionMd'
	},
	turn720: {
		title: 'assignmentTurn720Title',
		description: 'assignmentTurn720DescriptionMd'
	}
};

export interface AssignmentProgress {
	id: AssignmentId;
	status: AssignmentStatus;
	startedAt: number;
	completedAt: number;
	durationMs: number;
	requirementMetAt: number;
	balanceHoldStartAt: number;
	data: Record<string, unknown>;
}

export interface AssignmentsState {
	order: AssignmentId[];
	currentAssignmentId: AssignmentId | null;
	waitingForAllDeployed: boolean;
	progress: Record<AssignmentId, AssignmentProgress>;
}

function createAssignmentProgress(id: AssignmentId): AssignmentProgress {
	return {
		id,
		status: 'locked',
		startedAt: 0,
		completedAt: 0,
		durationMs: 0,
		requirementMetAt: 0,
		balanceHoldStartAt: 0,
		data: {}
	};
}

export function createAssignmentsState(): AssignmentsState {
	return {
		order: ASSIGNMENT_DEFINITIONS.map((definition) => definition.id),
		currentAssignmentId: null,
		waitingForAllDeployed: true,
		progress: ASSIGNMENT_DEFINITIONS.reduce<Record<AssignmentId, AssignmentProgress>>(
			(acc, definition) => {
				acc[definition.id] = createAssignmentProgress(definition.id);
				return acc;
			},
			{} as Record<AssignmentId, AssignmentProgress>
		)
	};
}
