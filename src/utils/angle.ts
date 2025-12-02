export function normalizeAngle(angle: number) {
	if (!Number.isFinite(angle)) {
		return 0;
	}

	const normalized = ((angle % 360) + 360) % 360;
	return normalized > 180 ? normalized - 360 : normalized;
}

export function isAngleWithinThreshold(angle: number, thresholdDegrees: number) {
	if (!Number.isFinite(thresholdDegrees) || thresholdDegrees <= 0) {
		return false;
	}

	return Math.abs(normalizeAngle(angle)) <= thresholdDegrees;
}
