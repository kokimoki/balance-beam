import { BeamDisplay } from '@/components/beam/beam-display';
import { config } from '@/config';
import { useServerTimer } from '@/hooks/useServerTime';
import { kmClient } from '@/services/km-client';
import { globalActions } from '@/state/actions/global-actions';
import {
	ASSIGNMENT_CONTENT_KEYS,
	ASSIGNMENT_DEFINITION_MAP,
	type AssignmentId
} from '@/state/assignments';
import { globalStore, type GlobalState } from '@/state/stores/global-store';
import { cn } from '@/utils/cn';
import { formatDurationSeconds } from '@/utils/formatDuration';
import { KmTimeCountdown } from '@kokimoki/shared';
import * as React from 'react';
import Markdown from 'react-markdown';
import { useSnapshot } from 'valtio';

interface Props {
	className?: string;
}

const getInitials = (name: string) => {
	if (!name) {
		return '';
	}
	const parts = name.trim().split(/\s+/).slice(0, 2);
	return parts
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
};

export const SharedStateView: React.FC<React.PropsWithChildren<Props>> = ({
	className
}) => {
	const state = useSnapshot(globalStore.proxy);
	const serverTime = useServerTimer(250);
	const mode = kmClient.clientContext.mode;

	if (mode === 'host') {
		return <HostStatePanel className={className} state={state} serverTime={serverTime} />;
	}

	if (mode === 'presenter') {
		return (
			<PresenterStatePanel
				className={className}
				state={state}
				serverTime={serverTime}
			/>
		);
	}

	return null;
};

interface StatePanelProps {
	className?: string;
	state: GlobalState;
	serverTime: number;
}

const HostStatePanel: React.FC<StatePanelProps> = ({ className, state, serverTime }) => {
	const [intervalSeconds, setIntervalSeconds] = React.useState(
		Math.round(state.deploymentIntervalMs / 1000)
	);
	const [physicsMultiplier, setPhysicsMultiplier] = React.useState(
		Number(state.physicsSpeedMultiplier.toFixed(2))
	);
	const nextPlayerId = state.deploymentQueue[0];
	const nextPlayerName = nextPlayerId
		? state.players[nextPlayerId]?.name ?? config.playerNamePlaceholder
		: config.noQueuedPlayerLabel;
	const nextDropMs = state.nextDeploymentAt
		? Math.max(0, state.nextDeploymentAt - serverTime)
		: 0;

	React.useEffect(() => {
		setIntervalSeconds(Math.round(state.deploymentIntervalMs / 1000));
	}, [state.deploymentIntervalMs]);

	React.useEffect(() => {
		setPhysicsMultiplier(Number(state.physicsSpeedMultiplier.toFixed(2)));
	}, [state.physicsSpeedMultiplier]);

	const handleIntervalChange = (value: number) => {
		setIntervalSeconds(value);
		globalActions.setDeploymentInterval(value * 1000).catch(() => {});
	};

	const handlePhysicsChange = (value: number) => {
		setPhysicsMultiplier(value);
		globalActions.setPhysicsSpeedMultiplier(value).catch(() => {});
	};

	return (
		<div className={cn('w-full rounded-lg border border-gray-200 bg-white p-6 shadow', className)}>
			<div className="prose mb-4">
				<Markdown>{config.sharedStateMd}</Markdown>
			</div>

			<div className="flex flex-wrap gap-4">
				<div className="flex-1 min-w-[220px]">
					<label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
						{config.hostDeploymentIntervalLabel}
						<input
							type="number"
							min={3}
							max={60}
							value={intervalSeconds}
							onChange={(event) => handleIntervalChange(Number(event.target.value) || 3)}
							className="rounded-lg border border-gray-300 px-3 py-2"
						/>
					</label>
				</div>
				<div className="flex-1 min-w-[220px]">
					<label className="flex flex-col gap-2 text-sm font-medium text-gray-700">
						{config.hostPhysicsSpeedLabel}
						<input
							type="range"
							min={0.25}
							max={2}
							step={0.05}
							value={physicsMultiplier}
							onChange={(event) => handlePhysicsChange(Number(event.target.value))}
						/>
						<span className="text-xs text-gray-500">{physicsMultiplier.toFixed(2)}x</span>
					</label>
				</div>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
				<div className="rounded-lg border border-gray-200 p-4">
					<div className="text-sm text-gray-500">{config.hostNextPlayerLabel}</div>
					<div className="text-2xl font-bold">{nextPlayerName}</div>
				</div>
				<div className="rounded-lg border border-gray-200 p-4">
					<div className="text-sm text-gray-500">{config.hostNextDropLabel}</div>
					<div className="text-2xl font-bold">
						{state.started && state.nextDeploymentAt ? (
							<KmTimeCountdown ms={nextDropMs} />
						) : (
							'--'
						)}
					</div>
				</div>
				<div className="rounded-lg border border-gray-200 p-4">
					<div className="text-sm text-gray-500">{config.hostTotalDeployedLabel}</div>
					<div className="text-2xl font-bold">{state.totalDeployed}</div>
				</div>
			</div>

			<div className="mt-6 flex gap-3">
				{!state.started ? (
					<button
						onClick={() => globalActions.startGame().catch(() => {})}
						className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
					>
						{config.startButton}
					</button>
				) : (
					<button
						onClick={() => globalActions.stopGame().catch(() => {})}
						className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
					>
						{config.stopButton}
					</button>
				)}
			</div>

			<AssignmentsPanel
				assignments={state.assignments}
				className="mt-6"
				serverTime={serverTime}
			/>
		</div>
	);
};

const PresenterStatePanel: React.FC<StatePanelProps> = ({
	className,
	state,
	serverTime
}) => {
	const deployedPlayers = Object.entries(state.players)
		.filter(([, player]) => player.status === 'deployed')
		.map(([id, player]) => {
			const displayName = player.name || config.playerNamePlaceholder;
			return {
				id,
				name: displayName,
				weight: player.weight,
				position: player.position,
				color: player.color,
				initials: getInitials(displayName)
			};
		});
	const nextDropMs = state.nextDeploymentAt
		? Math.max(0, state.nextDeploymentAt - serverTime)
		: 0;
	const nextPlayerId = state.deploymentQueue[0];
	const nextPlayerName = nextPlayerId
		? state.players[nextPlayerId]?.name ?? config.playerNamePlaceholder
		: config.noQueuedPlayerLabel;
	const activeAssignmentId = state.assignments.currentAssignmentId;
	const highlightCenterZone = Boolean(
		activeAssignmentId &&
		ASSIGNMENT_DEFINITION_MAP[activeAssignmentId]?.highlightCenterThird
	);

	return (
		<div className={cn('w-full rounded-lg border border-gray-200 bg-white p-6 shadow', className)}>
			<div className="mb-6 text-center">
				<h2 className="text-2xl font-bold">{config.playerBeamTitle}</h2>
				<p className="text-sm text-gray-500">{config.presenterDeployedLabel}</p>
			</div>

			<BeamDisplay
				angle={state.beam.angle}
				players={deployedPlayers}
				showWeights={false}
				variant="presenter"
				highlightCenterZone={highlightCenterZone}
				centerZoneLabel={config.assignmentCenterZoneLabel}
			/>

			<div className="mt-6 grid gap-4 md:grid-cols-3">
				<div className="rounded-lg border border-gray-200 p-4 text-center">
					<div className="text-sm text-gray-500">{config.presenterDeployedLabel}</div>
					<div className="text-3xl font-bold">{deployedPlayers.length}</div>
				</div>
				<div className="rounded-lg border border-gray-200 p-4 text-center">
					<div className="text-sm text-gray-500">{config.presenterNextDropLabel}</div>
					<div className="text-3xl font-bold">
						{state.started && state.nextDeploymentAt ? (
							<KmTimeCountdown ms={nextDropMs} />
						) : (
							'--'
						)}
					</div>
				</div>
				<div className="rounded-lg border border-gray-200 p-4 text-center">
					<div className="text-sm text-gray-500">{config.presenterNextPlayerLabel}</div>
					<div className="text-3xl font-bold">{nextPlayerName}</div>
				</div>
			</div>

			<AssignmentsPanel
				assignments={state.assignments}
				className="mt-6"
				serverTime={serverTime}
			/>
		</div>
	);
};

interface AssignmentsPanelProps {
	assignments: GlobalState['assignments'];
	className?: string;
	serverTime: number;
}

const statusLabelMap = {
	locked: config.assignmentStatusLockedLabel,
	active: config.assignmentStatusActiveLabel,
	completed: config.assignmentStatusCompletedLabel
} as const;

const AssignmentsPanel: React.FC<AssignmentsPanelProps> = ({ assignments, className, serverTime }) => {
	const activeId = assignments.currentAssignmentId;
	const activeContent = activeId ? getAssignmentContent(activeId) : null;
	const activeProgress = activeId ? assignments.progress[activeId] : null;
	const activeElapsedMs =
		activeProgress?.status === 'active' && activeProgress.startedAt
			? Math.max(0, serverTime - activeProgress.startedAt)
			: 0;
	const holdHint = config.assignmentHoldHint
		.replace('{degrees}', String(config.assignmentBalanceToleranceDegrees))
		.replace('{seconds}', String(config.assignmentBalanceHoldSeconds));
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

	return (
		<div className={cn('rounded-lg border border-gray-200 bg-slate-50 p-5 shadow-inner', className)}>
			<div className="mb-4">
				<h3 className="text-xl font-bold text-slate-900">{config.assignmentsTitle}</h3>
				<p className="text-sm text-slate-600">{holdHint}</p>
			</div>

			{assignments.waitingForAllDeployed ? null : activeElapsedMs > 0 ? (
				<div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
					<span className="text-sm font-semibold text-slate-600">{config.timeElapsed}</span>
					<span className="font-mono text-lg text-slate-900">
						{formatDurationSeconds(activeElapsedMs)}
					</span>
				</div>
			) : null}

			<div className="mb-5 rounded-lg border border-slate-200 bg-white p-4">
				<div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					{config.assignmentCurrentTaskLabel}
				</div>
				{assignments.waitingForAllDeployed ? (
					<p className="mt-2 text-sm text-slate-500">
						{config.assignmentsWaitingForDeploymentLabel}
					</p>
				) : activeContent ? (
					<div className="mt-2">
						<h4 className="text-lg font-semibold text-slate-900">{activeContent.title}</h4>
						<div className="prose prose-sm text-slate-700">
							<Markdown>{activeContent.description}</Markdown>
						</div>
					</div>
				) : (
					<p className="mt-2 text-sm text-slate-500">{config.assignmentNoActiveLabel}</p>
				)}
			</div>

			{allCompleted && (
				<div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
					<div className="text-sm font-semibold text-emerald-800">
						{config.assignmentNoActiveLabel}
					</div>
					<div className="text-xs uppercase tracking-wide text-emerald-700">
						{config.timeElapsed}
					</div>
					<div className="text-2xl font-bold text-emerald-900">
						{formatDurationSeconds(totalDurationMs)}
					</div>
				</div>
			)}

			<div className="space-y-3">
				{assignments.order.map((assignmentId) => {
					const progress = assignments.progress[assignmentId];
					const { title } = getAssignmentContent(assignmentId);
					const durationLabel =
						progress.status === 'completed'
							? formatDurationSeconds(progress.durationMs)
							: '--';
					return (
						<div
							key={assignmentId}
							className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0"
						>
							<div>
								<div className="font-semibold text-slate-900">{title}</div>
								<div className="text-xs uppercase tracking-wide text-slate-500">
									{statusLabelMap[progress.status]}
								</div>
							</div>
							<div className="text-sm text-slate-600">
								{config.assignmentDurationLabel}:{' '}
								<span className="font-semibold">{durationLabel}</span>
							</div>
						</div>
					);
				})}
			</div>
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
