import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import { globalStore } from '@/state/stores/global-store';
import { useEffect, useRef } from 'react';
import { useSnapshot } from 'valtio';
import { useServerTimer } from './useServerTime';

const CONTROLLER_HEARTBEAT_INTERVAL_MS = 1000;
const CONTROLLER_STALE_TIMEOUT_MS = 4000;

export function useGlobalController() {
	const {
		controllerConnectionId,
		controllerHeartbeat,
		started,
		deploymentQueue,
		nextDeploymentAt
	} = useSnapshot(globalStore.proxy);
	const connections = useSnapshot(globalStore.connections);
	const connectionIds = connections.connectionIds;
	const isGlobalController = controllerConnectionId === kmClient.connectionId;
	const serverTime = useServerTimer(200); // faster ticks for smoother physics
	const lastHeartbeatSentRef = useRef(0);

	// Maintain connection that is assigned to be the global controller
	useEffect(() => {
		const now = kmClient.serverTimestamp();
		const controllerOnline = controllerConnectionId
			? connectionIds.has(controllerConnectionId)
			: false;
		const heartbeatAge = controllerHeartbeat ? now - controllerHeartbeat : Number.POSITIVE_INFINITY;
		const controllerMissing =
			!controllerConnectionId || !controllerOnline || heartbeatAge > CONTROLLER_STALE_TIMEOUT_MS;

		if (!controllerMissing) {
			return;
		}

		const candidates = Array.from(connectionIds);
		if (candidates.length === 0) {
			return;
		}

		candidates.sort();
		const nextControllerId = candidates[0];
		globalActions.assignController(nextControllerId, now).catch(() => {});
	}, [connectionIds, controllerConnectionId, controllerHeartbeat, serverTime]);

	useEffect(() => {
		if (!isGlobalController) {
			lastHeartbeatSentRef.current = 0;
		}
	}, [isGlobalController]);

	// Run global controller-specific logic
	useEffect(() => {
		if (!isGlobalController) {
			return;
		}

		const now = kmClient.serverTimestamp();
		globalActions.updateBeamPhysics(now).catch(() => {});
		globalActions.evaluateAssignments(now).catch(() => {});

		if (now - lastHeartbeatSentRef.current >= CONTROLLER_HEARTBEAT_INTERVAL_MS) {
			lastHeartbeatSentRef.current = now;
			globalActions.updateControllerHeartbeat(now).catch(() => {});
		}

		if (!started || deploymentQueue.length === 0) {
			return;
		}

		if (nextDeploymentAt === 0 || now < nextDeploymentAt) {
			return;
		}

		const randomPosition = (Math.random() * 2 - 1) * 0.5;
		globalActions.deployNextQueuedPlayer(randomPosition).catch(() => {});
	}, [isGlobalController, serverTime, started, deploymentQueue, nextDeploymentAt]);

	return isGlobalController;
}
