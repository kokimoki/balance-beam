import { kmClient } from '@/services/km-client';

export type PlayerView = 'lobby' | 'countdown' | 'beam' | 'connections';

export interface PlayerState {
	name: string;
	weight: number;
	currentView: PlayerView;
	pendingDeploymentTimestamp: number;
	lastKnownPosition: number;
}

const initialState: PlayerState = {
	name: '',
	weight: 0,
	currentView: 'lobby',
	pendingDeploymentTimestamp: 0,
	lastKnownPosition: 0
};

export const playerStore = kmClient.localStore<PlayerState>(
	'player',
	initialState
);
