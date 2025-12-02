export function formatDurationSeconds(ms: number, decimals = 1) {
	if (!Number.isFinite(ms) || ms <= 0) {
		return `0.${'0'.repeat(decimals)}s`;
	}
	const seconds = ms / 1000;
	return `${seconds.toFixed(decimals)}s`;
}
