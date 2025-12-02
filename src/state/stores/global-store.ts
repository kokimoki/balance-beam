import { kmClient } from '@/services/km-client';
import { createAssignmentsState, type AssignmentsState } from '@/state/assignments';

export type BeamPlayerStatus = 'waiting' | 'deployed';

export interface BeamPlayerState {
	name: string;
	weight: number;
	status: BeamPlayerStatus;
	queuedAt: number;
	deployedAt: number;
	position: number;
	color: string;
}

export interface BeamState {
	angle: number;
	angularVelocity: number;
	lastUpdate: number;
}

export interface GlobalState {
	controllerConnectionId: string;
	controllerHeartbeat: number;
	started: boolean;
	startTimestamp: number;
	players: Record<string, BeamPlayerState>;
	deploymentQueue: string[];
	deploymentIntervalMs: number;
	physicsSpeedMultiplier: number;
	lastDeploymentTimestamp: number;
	nextDeploymentAt: number;
	totalDeployed: number;
	beam: BeamState;
	assignments: AssignmentsState;
}

const initialState: GlobalState = {
	controllerConnectionId: '',
	controllerHeartbeat: 0,
	started: false,
	startTimestamp: 0,
	players: {},
	deploymentQueue: [],
	deploymentIntervalMs: 15000,
	physicsSpeedMultiplier: 1,
	lastDeploymentTimestamp: 0,
	nextDeploymentAt: 0,
	totalDeployed: 0,
	beam: {
		angle: 0,
		angularVelocity: 0,
		lastUpdate: 0
	},
	assignments: createAssignmentsState()
};

export const globalStore = kmClient.store<GlobalState>('global', initialState);
