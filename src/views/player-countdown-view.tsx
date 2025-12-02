import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { playerActions } from '@/state/actions/player-actions';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { cn } from '@/utils/cn';
import { KmTimeCountdown } from '@kokimoki/shared';
import * as React from 'react';
import Markdown from 'react-markdown';
import { useSnapshot } from 'valtio';

interface Props {
	className?: string;
}

export const PlayerCountdownView: React.FC<Props> = ({ className }) => {
	const { pendingDeploymentTimestamp } = useSnapshot(playerStore.proxy);
	const {
		deploymentQueue,
		nextDeploymentAt,
		deploymentIntervalMs,
		started,
		startTimestamp
	} = useSnapshot(globalStore.proxy);
	const serverTime = useServerTimer(250);
	const myIndex = deploymentQueue.indexOf(kmClient.id ?? '');
	const fallbackBase = started ? nextDeploymentAt || startTimestamp : 0;
	const predictedTimestamp =
		myIndex >= 0 && fallbackBase
			? fallbackBase + myIndex * deploymentIntervalMs
			: pendingDeploymentTimestamp;
	const countdownTarget = predictedTimestamp || pendingDeploymentTimestamp;
	const msRemaining = Math.max(0, countdownTarget - serverTime);

	React.useEffect(() => {
		if (!countdownTarget || countdownTarget === pendingDeploymentTimestamp) {
			return;
		}

		playerActions.setPendingDeploymentTimestamp(countdownTarget).catch(() => {});
	}, [countdownTarget, pendingDeploymentTimestamp]);

	return (
		<div
			className={cn(
				'flex w-full max-w-lg flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 text-center shadow',
				className
			)}
		>
			<div>
				<h2 className="text-xl font-bold">{config.playerCountdownTitle}</h2>
				<div className="prose mx-auto mt-2 text-left">
					<Markdown>{config.playerCountdownDescriptionMd}</Markdown>
				</div>
			</div>

			<div className="flex flex-col items-center gap-2">
				<span className="text-sm uppercase tracking-widest text-gray-500">
					{config.playerCountdownTitle}
				</span>
				<span className="text-4xl font-black">
					{started && countdownTarget ? (
						<KmTimeCountdown ms={msRemaining} />
					) : (
						config.loading
					)}
				</span>
				{myIndex >= 0 && (
					<span className="text-sm text-gray-500">
						{config.playerQueuePositionLabel}: #{myIndex + 1}
					</span>
				)}
				{!started && (
					<span className="text-sm text-gray-500">
						{config.playerWaitingForHostLabel}
					</span>
				)}
			</div>
		</div>
	);
};
