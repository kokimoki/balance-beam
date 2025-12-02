import { config } from '@/config';
import { globalStore } from '@/state/stores/global-store';
import { normalizeAngle } from '@/utils/angle';
import { cn } from '@/utils/cn';
import { AlertTriangle } from 'lucide-react';
import * as React from 'react';
import { useSnapshot } from 'valtio';

export type BalanceWarningVariant = 'banner' | 'pill';

interface BalanceWarningProps {
	className?: string;
	variant?: BalanceWarningVariant;
}

export function useIsBeamImbalanced() {
	const { beam } = useSnapshot(globalStore.proxy);
	const balancedAngle = normalizeAngle(beam.angle);
	return Math.abs(balancedAngle) >= config.balanceWarningAngle;
}

export const BalanceWarning: React.FC<BalanceWarningProps> = ({
	className,
	variant = 'banner'
}) => {
	const isImbalanced = useIsBeamImbalanced();

	if (!isImbalanced) {
		return null;
	}

	const icon = (
		<AlertTriangle
			className="h-5 w-5 flex-shrink-0"
			aria-hidden={true}
		/>
	);

	if (variant === 'pill') {
		return (
			<div
				className={cn(
					'flex items-center gap-2 rounded-full bg-red-600/90 px-3 py-1 text-sm font-semibold text-white shadow',
					className
				)}
				role="status"
				aria-live="polite"
			>
				{icon}
				<span>{config.balanceWarningTitle}</span>
			</div>
		);
	}

	return (
		<div
			className={cn(
				'flex flex-col gap-1 rounded-lg border border-red-500 bg-red-50 px-4 py-3 text-red-900 shadow-sm',
				className
			)}
			role="region"
			aria-live="polite"
			aria-label={config.balanceWarningTitle}
		>
			<div className="flex items-center gap-2 font-semibold">
				{icon}
				<span>{config.balanceWarningTitle}</span>
			</div>
			<p className="text-sm text-red-800">{config.balanceWarningDescription}</p>
		</div>
	);
};
