import { BeamDisplay } from '@/components/beam/beam-display';
import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { playerActions } from '@/state/actions/player-actions';
import {
	ASSIGNMENT_CONTENT_KEYS,
	ASSIGNMENT_DEFINITION_MAP,
	type AssignmentId
} from '@/state/assignments';
import { globalStore } from '@/state/stores/global-store';
import { playerStore } from '@/state/stores/player-store';
import { cn } from '@/utils/cn';
import { formatDurationSeconds } from '@/utils/formatDuration';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';
import Markdown from 'react-markdown';
import { useSnapshot } from 'valtio';

interface Props {
	className?: string;
}

export const PlayerBeamView: React.FC<Props> = ({ className }) => {
	const { beam, players, assignments } = useSnapshot(globalStore.proxy);
	const { lastKnownPosition } = useSnapshot(playerStore.proxy);
	const serverTime = useServerTimer(250);
	const selfPlayer = players[kmClient.id ?? ''];
	const isDeployed = selfPlayer?.status === 'deployed';
	const playerMarkers = isDeployed
		? [
			{
				id: kmClient.id ?? 'self',
				name: selfPlayer?.name ?? config.playerNamePlaceholder,
				weight: selfPlayer?.weight ?? 0,
				position: selfPlayer?.position ?? 0,
				isSelf: true,
				color: selfPlayer?.color
			}
		  ]
		: [];

	const handleMove = (direction: 'left' | 'right') => {
		playerActions.nudgeBeamPosition(direction).catch(() => {});
	};

	const activeAssignmentId = assignments.currentAssignmentId;
	const activeAssignmentContent = activeAssignmentId
		? getAssignmentContent(activeAssignmentId)
		: null;
	const activeProgress = activeAssignmentId
		? assignments.progress[activeAssignmentId]
		: null;
	const activeElapsedMs =
		activeProgress?.status === 'active' && activeProgress.startedAt
			? Math.max(0, serverTime - activeProgress.startedAt)
			: 0;
	const allCompleted = assignments.order.every(
		(id) => assignments.progress[id].status === 'completed'
	);
	const totalDurationMs = assignments.order.reduce((total, assignmentId) => {
		const progress = assignments.progress[assignmentId];
		if (progress.status === 'completed') {
			return total + progress.durationMs;
		}
		return total;
	}, 0);
	const highlightCenterZone = Boolean(
		activeAssignmentId && ASSIGNMENT_DEFINITION_MAP[activeAssignmentId]?.highlightCenterThird
	);

	return (
		<div
			className={cn(
				'w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow',
				className
			)}
		>
			<div className="mb-4 text-center">
				<h2 className="text-2xl font-bold">{config.playerBeamTitle}</h2>
				<p className="text-sm text-gray-500">
					{isDeployed
						? config.playerBeamActiveHint
						: config.playerBeamLockedHint}
				</p>
			</div>


			{assignments.waitingForAllDeployed ? (
				<div className="mb-6 rounded-lg border border-dashed border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
					{config.assignmentsWaitingForDeploymentLabel}
				</div>
			) : (
				<div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-left">
					<div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
						{config.assignmentCurrentTaskLabel}
					</div>
					{activeAssignmentContent ? (
						<div className="mt-2 space-y-2">
							<h3 className="text-lg font-semibold text-blue-900">
								{activeAssignmentContent.title}
							</h3>
							<div className="prose prose-sm text-blue-900">
								<Markdown>{activeAssignmentContent.description}</Markdown>
							</div>
						</div>
					) : (
						<p className="mt-2 text-sm text-blue-800">{config.assignmentNoActiveLabel}</p>
					)}
				</div>
			)}

			{assignments.waitingForAllDeployed ? null : activeElapsedMs > 0 ? (
				<div className="mb-6 flex items-center justify-between rounded-lg border border-blue-100 bg-white p-3">
					<span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
						{config.timeElapsed}
					</span>
					<span className="font-mono text-lg text-blue-900">
						{formatDurationSeconds(activeElapsedMs)}
					</span>
				</div>
			) : null}

			{allCompleted && (
				<div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
					<div className="text-sm font-semibold text-emerald-800">
						{config.assignmentNoActiveLabel}
					</div>
					<div className="text-xs uppercase tracking-wide text-emerald-700">
						{config.timeElapsed}
					</div>
					<div className="text-2xl font-bold text-emerald-900">
						{formatDurationSeconds(totalDurationMs)}
					</div>
					<ul className="mt-3 space-y-1 text-sm text-emerald-900">
						{assignments.order.map((assignmentId) => {
							const summary = assignments.progress[assignmentId];
							const { title } = getAssignmentContent(assignmentId);
							if (summary.status !== 'completed') {
								return null;
							}
							return (
								<li key={assignmentId} className="flex items-center justify-between">
									<span>{title}</span>
									<span className="font-mono text-sm font-semibold">
										{formatDurationSeconds(summary.durationMs)}
									</span>
								</li>
							);
						})}
					</ul>
				</div>
			)}

			<BeamDisplay
				angle={beam.angle}
				players={playerMarkers}
				highlightCenterZone={highlightCenterZone}
				centerZoneLabel={config.assignmentCenterZoneLabel}
			/>

			<div className="mt-6 flex flex-row gap-3">
				<button
					onClick={() => handleMove('left')}
					disabled={!isDeployed}
					className="flex-1 rounded-lg bg-blue-100 px-4 py-2 text-blue-900 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span className="flex items-center justify-center gap-2 font-semibold">
						<ChevronLeft aria-hidden="true" />
						{config.playerMoveLeftLabel}
					</span>
				</button>
				<button
					onClick={() => handleMove('right')}
					disabled={!isDeployed}
					className="flex-1 rounded-lg bg-blue-100 px-4 py-2 text-blue-900 transition hover:bg-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span className="flex items-center justify-center gap-2 font-semibold">
						{config.playerMoveRightLabel}
						<ChevronRight aria-hidden="true" />
					</span>
				</button>
			</div>

			{isDeployed && (
				<p className="mt-4 text-center text-sm text-gray-500">
					{config.playerCurrentPositionLabel}:{' '}
					{(selfPlayer?.position ?? lastKnownPosition).toFixed(2)}
				</p>
			)}
		</div>
	);
};

function getAssignmentContent(assignmentId: AssignmentId) {
	const keys = ASSIGNMENT_CONTENT_KEYS[assignmentId];
	return {
		title: config[keys.title],
		description: config[keys.description]
	};
}
