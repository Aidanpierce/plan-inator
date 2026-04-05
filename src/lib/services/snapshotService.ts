import type { Task, TimeEntry, DayTemplateWithCommitments, ProductivitySnapshot } from '../db/types.js';
import { findTemplateForDate, calculateRawAvailableMinutes } from './timeBudget.js';

/**
 * Computes a ProductivitySnapshot for a given ISO date (YYYY-MM-DD).
 *
 * Productive minutes = all tracked time that started on that day.
 * Available minutes = raw budget from the matching day template (before productivity factor).
 * Category breakdown = minutes per categoryId derived from task lookups.
 */
export function computeSnapshotForDate(
	date: string,
	allEntries: TimeEntry[],
	allTasks: Task[],
	templates: DayTemplateWithCommitments[]
): Omit<ProductivitySnapshot, 'id'> {
	const template = findTemplateForDate(new Date(date + 'T12:00:00'), templates);
	const availableMinutes = template ? calculateRawAvailableMinutes(template) : 0;

	// Count entries that started on this date and have a recorded duration
	const dayEntries = allEntries.filter(
		(e) => e.startedAt.startsWith(date) && (e.durationMinutes ?? 0) > 0
	);

	const productiveMinutes = dayEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);

	// Build category breakdown
	const taskMap = new Map(allTasks.map((t) => [t.id, t]));
	const categoryBreakdown: Record<string, number> = {};
	for (const entry of dayEntries) {
		const task = taskMap.get(entry.taskId);
		if (!task) continue;
		categoryBreakdown[task.categoryId] =
			(categoryBreakdown[task.categoryId] ?? 0) + (entry.durationMinutes ?? 0);
	}

	const factor = availableMinutes > 0 ? Math.min(1, productiveMinutes / availableMinutes) : 0;

	return { date, availableMinutes, productiveMinutes, factor, categoryBreakdown };
}
