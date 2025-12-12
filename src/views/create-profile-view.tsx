import { config } from '@/config';
import { playerActions } from '@/state/actions/player-actions';
import { cn } from '@/utils/cn';
import * as React from 'react';

interface Props {
	className?: string;
}

/**
 * View to create a player profile by entering a name
 */
const MIN_WEIGHT = 25;
const MAX_WEIGHT = 125;
const WEIGHT_STEP = 5;

export const CreateProfileView: React.FC<Props> = ({ className }) => {
	const [name, setName] = React.useState('');
	const [weight, setWeight] = React.useState<number>(75);
	const [isLoading, setIsLoading] = React.useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const trimmedName = name.trim();
		if (!trimmedName) {
			return;
		}

		setIsLoading(true);
		try {
			await playerActions.setPlayerProfile(trimmedName, weight);
		} finally {
			setIsLoading(false);
		}
	};

	const canSubmit = name.trim().length > 0 && !isLoading;

	return (
		<div
			className={cn(
				'bg-white border border-gray-200 rounded-lg shadow-md w-full max-w-96',
				className
			)}
		>
			<div className="p-6">
				<h2 className="mb-2 text-xl font-bold">{config.playerNameTitle}</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<label className="block text-left text-sm font-medium text-gray-700">
						{config.playerNameLabel}
						<input
							type="text"
							placeholder={config.playerNamePlaceholder}
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={isLoading}
							autoFocus
							maxLength={50}
							className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</label>
					<label className="block text-left text-sm font-medium text-gray-700">
						<div className="mb-2 flex items-center justify-between gap-2">
							<span>{config.playerWeightLabel}</span>
							<span className="text-base font-semibold text-gray-900">{weight}</span>
						</div>
						<input
							type="range"
							min={MIN_WEIGHT}
							max={MAX_WEIGHT}
							step={WEIGHT_STEP}
							value={weight}
							onChange={(e) => setWeight(Number(e.target.value))}
							disabled={isLoading}
							className="mt-1 w-full accent-blue-500"
							aria-valuemin={MIN_WEIGHT}
							aria-valuemax={MAX_WEIGHT}
							aria-valuenow={weight}
						/>
						<p className="mt-1 text-xs text-gray-500">{config.playerWeightPlaceholder}</p>
						<div className="mt-1 flex justify-between text-xs text-gray-500">
							<span>{MIN_WEIGHT}</span>
							<span>{MAX_WEIGHT}</span>
						</div>
					</label>
					<button
						type="submit"
						className="w-full px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={!canSubmit}
					>
						{isLoading ? (
							<>
								<span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
								{config.loading}
							</>
						) : (
							config.playerNameButton
						)}
					</button>
				</form>
			</div>
		</div>
	);
};
