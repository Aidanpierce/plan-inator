import type { ProductivitySnapshot } from '../db/types.js';

export const DEFAULT_PRODUCTIVITY_FACTOR = 0.5;
const MIN_FACTOR = 0.1;
const MAX_FACTOR = 1.0;
const WINDOW_DAYS = 14;
// Exponential decay rate: weight = exp(-DECAY * daysAgo)
const DECAY = 0.1;

/**
 * Calculates a productivity factor (0.1–1.0) from historical snapshots using a
 * 14-day exponentially-decayed weighted average of (productiveMinutes / availableMinutes).
 *
 * Returns DEFAULT_PRODUCTIVITY_FACTOR (0.5) if there are no usable snapshots.
 */
export function calculateProductivityFactor(snapshots: ProductivitySnapshot[]): number {
	if (snapshots.length === 0) return DEFAULT_PRODUCTIVITY_FACTOR;

	// Sort descending so index 0 is the most recent day
	const sorted = [...snapshots].sort((a, b) => b.date.localeCompare(a.date));
	const recent = sorted.slice(0, WINDOW_DAYS);

	const mostRecentDate = new Date(recent[0].date + 'T00:00:00');

	let weightedSum = 0;
	let totalWeight = 0;

	for (const snapshot of recent) {
		if (snapshot.availableMinutes === 0) continue;

		const daysAgo = Math.round(
			(mostRecentDate.getTime() - new Date(snapshot.date + 'T00:00:00').getTime()) / 86_400_000
		);
		const weight = Math.exp(-DECAY * daysAgo);
		const rawFactor = snapshot.productiveMinutes / snapshot.availableMinutes;

		weightedSum += rawFactor * weight;
		totalWeight += weight;
	}

	if (totalWeight === 0) return DEFAULT_PRODUCTIVITY_FACTOR;

	const result = weightedSum / totalWeight;
	return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, result));
}

/** Human-readable summary of the data window used for the factor calculation. */
export function productivityWindowLabel(snapshots: ProductivitySnapshot[]): string {
	const usable = snapshots.filter((s) => s.availableMinutes > 0);
	if (usable.length === 0) return 'No data yet — using default 50%';
	return `Based on ${usable.length} day${usable.length === 1 ? '' : 's'} of data`;
}
