import type { Task, TimeEntry } from '../db/types.js';

export interface EstimationResult {
	estimateMinutes: number;
	confidence: number; // 0–1
	dataPoints: number;
}

/** Total tracked minutes for a task from its time entries. */
export function getActualMinutes(taskId: string, entries: TimeEntry[]): number {
	return entries
		.filter((e) => e.taskId === taskId && (e.durationMinutes ?? 0) > 0)
		.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
}

/**
 * Estimates task duration using a log-normal model fitted to historical data.
 *
 * Requires 3+ completed tasks in the same category **and** type that have
 * actual time tracked. Returns null if there is insufficient data.
 *
 * The estimate is the geometric mean (median of the fitted log-normal), which
 * is more robust to outliers than the arithmetic mean.
 *
 * Confidence is 0–1 and reflects both the amount of data and how consistent
 * the historical durations are (lower spread → higher confidence).
 */
export function estimateTaskDuration(
	task: Pick<Task, 'categoryId' | 'type'>,
	completedTasks: Task[],
	allEntries: TimeEntry[]
): EstimationResult | null {
	// Only use completed tasks in the same category and type
	const matching = completedTasks.filter(
		(t) => t.status === 'completed' && t.categoryId === task.categoryId && t.type === task.type
	);

	const durations = matching
		.map((t) => getActualMinutes(t.id, allEntries))
		.filter((d) => d > 0);

	if (durations.length < 3) return null;

	// Fit log-normal: mu and sigma of log(durations)
	const logDurations = durations.map((d) => Math.log(d));
	const mu = logDurations.reduce((sum, x) => sum + x, 0) / logDurations.length;
	const variance =
		logDurations.reduce((sum, x) => sum + (x - mu) ** 2, 0) / logDurations.length;
	const sigma = Math.sqrt(variance);

	// Median of log-normal = exp(mu)
	const estimateMinutes = Math.max(1, Math.round(Math.exp(mu)));

	// Confidence: grows with more data points and shrinks with higher spread.
	// dataPtsFactor: 0 at n=2, asymptotes toward 1 as n grows
	const dataPtsFactor = 1 - Math.exp(-0.2 * (durations.length - 2));
	// consistencyFactor: 1 when sigma=0 (all tasks took exactly the same time),
	// drops toward 0 as durations become more spread out
	const consistencyFactor = Math.exp(-sigma);
	const confidence = Math.min(0.95, dataPtsFactor * consistencyFactor);

	return {
		estimateMinutes,
		confidence: Math.max(0, confidence),
		dataPoints: durations.length
	};
}

/**
 * Selects the best available estimate for a task.
 * Prefers the system (log-normal) estimate when enough data exists,
 * falls back to the user-provided estimate.
 */
export function getBestEstimate(
	task: Task,
	completedTasks: Task[],
	allEntries: TimeEntry[]
): { minutes: number; isSystemEstimate: boolean; confidence?: number } | null {
	const system = estimateTaskDuration(task, completedTasks, allEntries);
	if (system) {
		return { minutes: system.estimateMinutes, isSystemEstimate: true, confidence: system.confidence };
	}
	if (task.estimatedMinutes) {
		return { minutes: task.estimatedMinutes, isSystemEstimate: false };
	}
	return null;
}
