import type { DailyBudget, DayTemplateWithCommitments, WeeklyBudget } from '../db/types.js';

const MINUTES_PER_DAY = 1440;

/**
 * Determine which day template applies to a given date.
 * Matching priority:
 *   1. Template whose dayOfWeek exactly matches (0 = Sun … 6 = Sat)
 *   2. Template named "Weekday" for Mon–Fri, "Weekend" for Sat–Sun
 *   3. First template in the list (fallback)
 */
export function findTemplateForDate(
	date: Date,
	templates: DayTemplateWithCommitments[]
): DayTemplateWithCommitments | undefined {
	if (templates.length === 0) return undefined;

	const dow = date.getDay(); // 0 = Sunday

	// Exact dayOfWeek match
	const exact = templates.find((t) => t.dayOfWeek === dow);
	if (exact) return exact;

	// Named weekday/weekend match
	const isWeekend = dow === 0 || dow === 6;
	const named = templates.find((t) =>
		isWeekend ? t.name.toLowerCase() === 'weekend' : t.name.toLowerCase() === 'weekday'
	);
	if (named) return named;

	// Fallback: first template
	return templates[0];
}

/**
 * Calculate the raw available minutes for a day (ignoring productivity factor).
 */
export function calculateRawAvailableMinutes(template: DayTemplateWithCommitments): number {
	const sleepMinutes = template.sleepHours * 60;
	const personalMinutes = template.personalHours * 60;
	const commitmentMinutes = template.commitments.reduce((sum, c) => sum + c.durationMinutes, 0);
	const raw = MINUTES_PER_DAY - sleepMinutes - personalMinutes - commitmentMinutes;
	return Math.max(0, raw);
}

/**
 * Calculate the daily time budget for a specific date.
 */
export function calculateDailyBudget(
	date: Date,
	templates: DayTemplateWithCommitments[],
	productivityFactor: number
): DailyBudget {
	const template = findTemplateForDate(date, templates);
	const isoDate = date.toISOString().split('T')[0];

	if (!template) {
		return {
			date: isoDate,
			rawAvailableMinutes: 0,
			effectiveAvailableMinutes: 0,
			sleepMinutes: 0,
			personalMinutes: 0,
			commitmentMinutes: 0,
			productivityFactor
		};
	}

	const sleepMinutes = template.sleepHours * 60;
	const personalMinutes = template.personalHours * 60;
	const commitmentMinutes = template.commitments.reduce((sum, c) => sum + c.durationMinutes, 0);
	const rawAvailableMinutes = Math.max(
		0,
		MINUTES_PER_DAY - sleepMinutes - personalMinutes - commitmentMinutes
	);
	const effectiveAvailableMinutes = Math.round(rawAvailableMinutes * productivityFactor);

	return {
		date: isoDate,
		rawAvailableMinutes,
		effectiveAvailableMinutes,
		sleepMinutes,
		personalMinutes,
		commitmentMinutes,
		productivityFactor
	};
}

/**
 * Calculate the weekly time budget starting from a given Monday.
 */
export function calculateWeeklyBudget(
	weekStart: Date,
	templates: DayTemplateWithCommitments[],
	productivityFactor: number
): WeeklyBudget {
	const days: DailyBudget[] = [];

	for (let i = 0; i < 7; i++) {
		const day = new Date(weekStart);
		day.setDate(weekStart.getDate() + i);
		days.push(calculateDailyBudget(day, templates, productivityFactor));
	}

	return {
		weekStart: weekStart.toISOString().split('T')[0],
		days,
		totalRawMinutes: days.reduce((sum, d) => sum + d.rawAvailableMinutes, 0),
		totalEffectiveMinutes: days.reduce((sum, d) => sum + d.effectiveAvailableMinutes, 0)
	};
}

/**
 * Get the Monday of the week containing the given date.
 */
export function getWeekStart(date: Date): Date {
	const d = new Date(date);
	const dow = d.getDay();
	const diff = dow === 0 ? -6 : 1 - dow; // Shift Sunday back 6, otherwise shift to Monday
	d.setDate(d.getDate() + diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

/** Format minutes as "Xh Ym" (e.g. "5h 30m" or "45m") */
export function formatMinutes(minutes: number): string {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (h === 0) return `${m}m`;
	if (m === 0) return `${h}h`;
	return `${h}h ${m}m`;
}

/** Short day name from ISO date string (e.g. "Mon") */
export function shortDayName(isoDate: string): string {
	return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}
