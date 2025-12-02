import { BalanceWarning } from '@/components/balance-warning';
import { NameLabel } from '@/components/player/name-label';
import { config } from '@/config';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useGlobalController } from '@/hooks/useGlobalController';
import { PlayerLayout } from '@/layouts/player';
import { kmClient } from '@/services/km-client';
import { playerActions } from '@/state/actions/player-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { normalizeAngle } from '@/utils/angle';
import { ConnectionsView } from '@/views/connections-view';
import { CreateProfileView } from '@/views/create-profile-view';
import { GameLobbyView } from '@/views/game-lobby-view';
import { PlayerBeamView } from '@/views/player-beam-view';
import { PlayerCountdownView } from '@/views/player-countdown-view';
import { KmModalProvider } from '@kokimoki/shared';
import * as React from 'react';
import { useSnapshot } from 'valtio';

const App: React.FC = () => {
	const { title } = config;
	const { name, currentView, pendingDeploymentTimestamp } =
		useSnapshot(playerStore.proxy);
	const {
		players,
		deploymentQueue,
		deploymentIntervalMs,
		nextDeploymentAt,
		startTimestamp,
		beam
	} = useSnapshot(globalStore.proxy);
	const selfPlayer = players[kmClient.id ?? ''];
	const isDeployed = selfPlayer?.status === 'deployed';
	const normalizedAngle = normalizeAngle(beam.angle);
	const isBeamStable =
		Math.abs(normalizedAngle) <= config.playerStableThresholdDegrees &&
		Math.abs(normalizedAngle) < config.balanceWarningAngle;

	useGlobalController();
	useDocumentTitle(title);

	React.useEffect(() => {
		if (!name) {
			if (currentView !== 'lobby') {
				playerActions.setCurrentView('lobby').catch(() => {});
			}
			return;
		}

		if (currentView === 'connections') {
			return;
		}

		if (isDeployed) {
			if (currentView !== 'beam') {
				playerActions.setCurrentView('beam').catch(() => {});
			}
			return;
		}

		if (currentView !== 'countdown') {
			playerActions.setCurrentView('countdown').catch(() => {});
		}
	}, [name, currentView, isDeployed]);

	React.useEffect(() => {
		if (!name) {
			return;
		}
		const myIndex = deploymentQueue.indexOf(kmClient.id ?? '');
		if (myIndex < 0) {
			return;
		}
		const baseTimestamp =
			nextDeploymentAt || startTimestamp || kmClient.serverTimestamp();
		const predicted = baseTimestamp + myIndex * deploymentIntervalMs;
		if (predicted !== pendingDeploymentTimestamp) {
			playerActions.setPendingDeploymentTimestamp(predicted).catch(() => {});
		}
	}, [
		name,
		deploymentQueue,
		nextDeploymentAt,
		startTimestamp,
		deploymentIntervalMs,
		pendingDeploymentTimestamp
	]);

	if (!name) {
		return (
			<PlayerLayout.Root>
				<PlayerLayout.Header />
				<PlayerLayout.Main>
					<CreateProfileView />
				</PlayerLayout.Main>
			</PlayerLayout.Root>
		);
	}

	return (
		<KmModalProvider>
			<PlayerLayout.Root>
				<PlayerLayout.Header>
					<div className="flex flex-wrap items-center gap-3">
						<BalanceWarning variant="pill" />
						{isBeamStable && (
							<div
								className="flex items-center rounded-full bg-emerald-600/90 px-3 py-1 text-sm font-semibold text-white shadow"
								role="status"
								aria-live="polite"
							>
								{config.playerBeamStableLabel}
							</div>
						)}
					</div>
				</PlayerLayout.Header>

				<PlayerLayout.Main>
					{currentView === 'lobby' && <GameLobbyView />}
					{currentView === 'countdown' && <PlayerCountdownView />}
					{currentView === 'beam' && <PlayerBeamView />}
					{currentView === 'connections' && <ConnectionsView />}
				</PlayerLayout.Main>

				<PlayerLayout.Footer>
					<NameLabel name={name} />
				</PlayerLayout.Footer>
			</PlayerLayout.Root>
		</KmModalProvider>
	);
};

export default App;
