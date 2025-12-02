import { CENTER_THIRD_THRESHOLD } from '@/state/assignments';
import { cn } from '@/utils/cn';
import * as React from 'react';

export interface BeamMarker {
	id: string;
	name: string;
	weight: number;
	position: number; // -1 to 1 across beam
	isSelf?: boolean;
	color?: string;
	initials?: string;
}

interface BeamDisplayProps {
	angle: number;
	players: BeamMarker[];
	showWeights?: boolean;
	variant?: 'default' | 'presenter';
	highlightCenterZone?: boolean;
	centerZoneLabel?: string;
}

const PRESENTER_WEIGHT_MIN = 40;
const PRESENTER_WEIGHT_MAX = 200;
const PRESENTER_BUBBLE_MIN = 40; // px
const PRESENTER_BUBBLE_MAX = 96; // px
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 28;
const CIRCLE_RADIUS = 45; // svg units (viewBox 0-100)
const BEAM_RADIUS = 32;
const TICK_INTERVAL = 10;
const MAJOR_TICK_INTERVAL = 30;
const LABEL_INTERVAL = 90;

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value));
}

function getPresenterBubbleSize(weight: number) {
	const effectiveWeight = clamp(
		Number.isFinite(weight) ? weight : PRESENTER_WEIGHT_MIN,
		PRESENTER_WEIGHT_MIN,
		PRESENTER_WEIGHT_MAX
	);
	const ratio =
		(effectiveWeight - PRESENTER_WEIGHT_MIN) /
		(PRESENTER_WEIGHT_MAX - PRESENTER_WEIGHT_MIN);
	return PRESENTER_BUBBLE_MIN + ratio * (PRESENTER_BUBBLE_MAX - PRESENTER_BUBBLE_MIN);
}

function getLinePoint(angleDeg: number, radius: number, invert = false) {
	const rad = (angleDeg * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	return {
		x: 50 + cos * radius * (invert ? -1 : 1),
		y: 50 + sin * radius * (invert ? -1 : 1)
	};
}

function getPlayerPosition(position: number, angleDeg: number) {
	const clamped = clamp(position, -1, 1);
	const rad = (angleDeg * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	return {
		left: 50 + cos * clamped * BEAM_RADIUS,
		top: 50 + sin * clamped * BEAM_RADIUS
	};
}

const tickAngles = Array.from({ length: 360 / TICK_INTERVAL }, (_, index) =>
	index * TICK_INTERVAL
);
const labelAngles = Array.from({ length: 360 / LABEL_INTERVAL }, (_, index) =>
	index * LABEL_INTERVAL
);

export const BeamDisplay: React.FC<BeamDisplayProps> = ({
	angle,
	players,
	showWeights = true,
	variant = 'default',
	highlightCenterZone = false,
	centerZoneLabel
}) => {
	const isPresenterVariant = variant === 'presenter';
	const startPoint = getLinePoint(angle, BEAM_RADIUS, true);
	const endPoint = getLinePoint(angle, BEAM_RADIUS, false);
	const centerStart = getPlayerPosition(-CENTER_THIRD_THRESHOLD, angle);
	const centerEnd = getPlayerPosition(CENTER_THIRD_THRESHOLD, angle);
	const centerLabelPosition = {
		x: (centerStart.left + centerEnd.left) / 2,
		y: (centerStart.top + centerEnd.top) / 2
	};

	return (
		<div className="flex w-full flex-col items-center gap-6">
			<div className="relative w-full max-w-2xl">
				<div className="aspect-square w-full">
					<div className="relative h-full w-full">
						<svg
							viewBox="0 0 100 100"
							className="absolute inset-0 h-full w-full"
							role="img"
							aria-label="Beam rotation dial"
						>
							<circle
								cx={50}
								cy={50}
								r={CIRCLE_RADIUS}
								fill="#0f172a0f"
								stroke="#cbd5f5"
								strokeWidth={0.5}
							/>

							{tickAngles.map((tickAngle) => {
								const isMajor = tickAngle % MAJOR_TICK_INTERVAL === 0;
								const outer = CIRCLE_RADIUS;
								const inner = outer - (isMajor ? 4 : 2);
								const rad = (tickAngle * Math.PI) / 180;
								const cos = Math.cos(rad);
								const sin = Math.sin(rad);
								const x1 = 50 + cos * inner;
								const y1 = 50 + sin * inner;
								const x2 = 50 + cos * outer;
								const y2 = 50 + sin * outer;
								return (
									<line
										key={`tick-${tickAngle}`}
										x1={x1}
										y1={y1}
										x2={x2}
										y2={y2}
										stroke="#94a3b8"
										strokeWidth={isMajor ? 0.8 : 0.4}
									/>
								);
							})}

							{labelAngles.map((labelAngle) => {
								const labelRadius = CIRCLE_RADIUS + 4;
								const rad = (labelAngle * Math.PI) / 180;
								const x = 50 + Math.cos(rad) * labelRadius;
								const y = 50 + Math.sin(rad) * labelRadius;
								return (
									<text
										key={`label-${labelAngle}`}
										x={x}
										y={y + 1.5}
										textAnchor="middle"
										fontSize={3}
										fill="#475569"
									>
										{labelAngle}°
									</text>
								);
							})}

							{highlightCenterZone && (
								<>
									<line
										x1={centerStart.left}
										y1={centerStart.top}
										x2={centerEnd.left}
										y2={centerEnd.top}
										stroke="#0ea5e9"
										strokeWidth={4}
										strokeLinecap="round"
										strokeDasharray="4 2"
										opacity={0.65}
									/>
									{centerZoneLabel && (
										<text
											x={centerLabelPosition.x}
											y={centerLabelPosition.y - 2}
											textAnchor="middle"
											fontSize={4}
											fill="#0369a1"
										>
											{centerZoneLabel}
										</text>
									)}
								</>
							)}

							<line
								x1={startPoint.x}
								y1={startPoint.y}
								x2={endPoint.x}
								y2={endPoint.y}
								stroke="#0f172a"
								strokeWidth={1.6}
								strokeLinecap="round"
							/>
							<circle
								cx={50}
								cy={50}
								r={1.8}
								fill="#1e293b"
							/>
						</svg>

						<div className="absolute inset-0">
							{players.map((player) => {
								const coordinates = getPlayerPosition(player.position, angle);
								const commonLabel = (
									<>
										<span
											className={cn(
												'rounded-full px-2 py-1 text-xs font-semibold text-white shadow',
												player.isSelf && 'ring-2 ring-white/80',
												!player.color && 'bg-slate-700'
											)}
											style={player.color ? { backgroundColor: player.color } : undefined}
										>
											{player.name}
										</span>
										{showWeights && (
											<span className="mt-1 rounded-full bg-black/30 px-2 py-0.5 text-[10px] font-normal">
												{player.weight}kg
											</span>
										)}
									</>
								);

								if (isPresenterVariant) {
									const bubbleSize = getPresenterBubbleSize(player.weight);
									const bubbleFontSize = clamp(bubbleSize * 0.35, MIN_FONT_SIZE, MAX_FONT_SIZE);
									return (
										<div
											key={player.id}
											className="absolute flex flex-col items-center gap-1 text-center"
											style={{
												left: `${coordinates.left}%`,
												top: `${coordinates.top}%`,
												transform: 'translate(-50%, -50%)'
											}}
										>
											<span
												className="flex items-center justify-center rounded-full text-base shadow"
												style={{
													backgroundColor: player.color || '#0f172a',
													width: `${bubbleSize}px`,
													height: `${bubbleSize}px`,
													fontSize: `${bubbleFontSize}px`
											}}
											>
												{player.initials || player.name.slice(0, 2).toUpperCase()}
											</span>
											<span className="text-[10px] font-normal text-slate-600">
												{player.name}
											</span>
										</div>
									);
								}

								return (
									<div
										key={player.id}
										className="absolute flex flex-col items-center text-center"
										style={{
											left: `${coordinates.left}%`,
											top: `${coordinates.top}%`,
											transform: 'translate(-50%, -50%)'
										}}
									>
										{commonLabel}
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};
