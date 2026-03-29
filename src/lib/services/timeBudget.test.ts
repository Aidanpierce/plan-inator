import { describe, it, expect } from 'vitest';
import {
	findTemplateForDate,
	calculateRawAvailableMinutes,
	calculateDailyBudget,
	calculateWeeklyBudget,
	getWeekStart,
	formatMinutes,
	shortDayName
} from './timeBudget.js';
import type { DayTemplateWithCommitments } from '../db/types.js';

// Helpers
function makeTemplate(
	overrides: Partial<DayTemplateWithCommitments> = {}
): DayTemplateWithCommitments {
	return {
		id: 'test-id',
		name: 'Weekday',
		sleepHours: 8,
		personalHours: 2,
		commitments: [],
		createdAt: '2024-01-01T00:00:00.000Z',
		...overrides
	};
}

function monday(): Date {
	return new Date('2024-01-08T12:00:00'); // A Monday
}

const weekdayTemplate = makeTemplate({ name: 'Weekday', sleepHours: 8, personalHours: 2 });
const weekendTemplate = makeTemplate({
	id: 'weekend',
	name: 'Weekend',
	sleepHours: 9,
	personalHours: 4
});
const bothTemplates = [weekdayTemplate, weekendTemplate];

// ── findTemplateForDate ───────────────────────────────────────────────────────

describe('findTemplateForDate', () => {
	it('returns undefined for empty template list', () => {
		expect(findTemplateForDate(monday(), [])).toBeUndefined();
	});

	it('matches template by exact dayOfWeek', () => {
		const mondayTemplate = makeTemplate({ dayOfWeek: 1 }); // Monday = 1
		const result = findTemplateForDate(monday(), [mondayTemplate]);
		expect(result?.id).toBe(mondayTemplate.id);
	});

	it('matches "Weekday" template for a weekday', () => {
		const result = findTemplateForDate(monday(), bothTemplates);
		expect(result?.name).toBe('Weekday');
	});

	it('matches "Weekend" template for a Saturday', () => {
		const saturday = new Date('2024-01-13T12:00:00'); // Saturday
		const result = findTemplateForDate(saturday, bothTemplates);
		expect(result?.name).toBe('Weekend');
	});

	it('matches "Weekend" template for a Sunday', () => {
		const sunday = new Date('2024-01-14T12:00:00'); // Sunday
		const result = findTemplateForDate(sunday, bothTemplates);
		expect(result?.name).toBe('Weekend');
	});

	it('falls back to first template when no name/dayOfWeek match', () => {
		const custom = makeTemplate({ name: 'Custom', id: 'custom' });
		const result = findTemplateForDate(monday(), [custom]);
		expect(result?.id).toBe('custom');
	});
});

// ── calculateRawAvailableMinutes ──────────────────────────────────────────────

describe('calculateRawAvailableMinutes', () => {
	it('calculates basic available minutes', () => {
		const template = makeTemplate({ sleepHours: 8, personalHours: 2, commitments: [] });
		// 1440 - 480 (sleep) - 120 (personal) = 840
		expect(calculateRawAvailableMinutes(template)).toBe(840);
	});

	it('subtracts commitment minutes', () => {
		const template = makeTemplate({
			sleepHours: 8,
			personalHours: 2,
			commitments: [
				{ id: 'c1', dayTemplateId: 'test-id', name: 'Class', durationMinutes: 90 },
				{ id: 'c2', dayTemplateId: 'test-id', name: 'Lab', durationMinutes: 60 }
			]
		});
		// 1440 - 480 - 120 - 90 - 60 = 690
		expect(calculateRawAvailableMinutes(template)).toBe(690);
	});

	it('never returns negative minutes', () => {
		const template = makeTemplate({ sleepHours: 16, personalHours: 10, commitments: [] });
		// 1440 - 960 - 600 = -120 → clamped to 0
		expect(calculateRawAvailableMinutes(template)).toBe(0);
	});

	it('handles zero sleep and personal hours', () => {
		const template = makeTemplate({ sleepHours: 0, personalHours: 0, commitments: [] });
		expect(calculateRawAvailableMinutes(template)).toBe(1440);
	});
});

// ── calculateDailyBudget ──────────────────────────────────────────────────────

describe('calculateDailyBudget', () => {
	it('returns zero budget when no templates exist', () => {
		const budget = calculateDailyBudget(monday(), [], 0.8);
		expect(budget.rawAvailableMinutes).toBe(0);
		expect(budget.effectiveAvailableMinutes).toBe(0);
	});

	it('applies productivity factor to raw minutes', () => {
		const budget = calculateDailyBudget(monday(), [weekdayTemplate], 0.6);
		// raw: 1440 - 480 - 120 = 840; effective: 840 * 0.6 = 504
		expect(budget.rawAvailableMinutes).toBe(840);
		expect(budget.effectiveAvailableMinutes).toBe(504);
	});

	it('returns correct date string', () => {
		const budget = calculateDailyBudget(monday(), [weekdayTemplate], 1);
		expect(budget.date).toBe('2024-01-08');
	});

	it('breaks down sleep, personal, commitment minutes', () => {
		const template = makeTemplate({
			sleepHours: 7,
			personalHours: 3,
			commitments: [{ id: 'c1', dayTemplateId: 'test-id', name: 'Class', durationMinutes: 180 }]
		});
		const budget = calculateDailyBudget(monday(), [template], 1);
		expect(budget.sleepMinutes).toBe(420);
		expect(budget.personalMinutes).toBe(180);
		expect(budget.commitmentMinutes).toBe(180);
		expect(budget.rawAvailableMinutes).toBe(1440 - 420 - 180 - 180);
	});

	it('productivity factor 1.0 gives full raw minutes as effective', () => {
		const budget = calculateDailyBudget(monday(), [weekdayTemplate], 1.0);
		expect(budget.effectiveAvailableMinutes).toBe(budget.rawAvailableMinutes);
	});
});

// ── calculateWeeklyBudget ─────────────────────────────────────────────────────

describe('calculateWeeklyBudget', () => {
	it('returns 7 days', () => {
		const wb = calculateWeeklyBudget(monday(), bothTemplates, 0.5);
		expect(wb.days).toHaveLength(7);
	});

	it('totals match sum of individual days', () => {
		const wb = calculateWeeklyBudget(monday(), bothTemplates, 0.7);
		const expectedRaw = wb.days.reduce((s, d) => s + d.rawAvailableMinutes, 0);
		const expectedEff = wb.days.reduce((s, d) => s + d.effectiveAvailableMinutes, 0);
		expect(wb.totalRawMinutes).toBe(expectedRaw);
		expect(wb.totalEffectiveMinutes).toBe(expectedEff);
	});

	it('uses weekend template for Sat/Sun', () => {
		const wb = calculateWeeklyBudget(monday(), bothTemplates, 1.0);
		// Saturday = index 5, Sunday = index 6
		const sat = wb.days[5];
		const sun = wb.days[6];
		// Weekend template: 9h sleep + 4h personal = 780 used, 660 raw
		expect(sat.rawAvailableMinutes).toBe(1440 - 9 * 60 - 4 * 60);
		expect(sun.rawAvailableMinutes).toBe(1440 - 9 * 60 - 4 * 60);
	});

	it('sets weekStart correctly', () => {
		const wb = calculateWeeklyBudget(monday(), [weekdayTemplate], 1);
		expect(wb.weekStart).toBe('2024-01-08');
	});
});

// ── getWeekStart ──────────────────────────────────────────────────────────────

describe('getWeekStart', () => {
	it('returns the same Monday for a Monday input', () => {
		const result = getWeekStart(new Date('2024-01-08T12:00:00'));
		expect(result.toISOString().startsWith('2024-01-08')).toBe(true);
	});

	it('returns the previous Monday for a Wednesday', () => {
		const result = getWeekStart(new Date('2024-01-10T12:00:00'));
		expect(result.toISOString().startsWith('2024-01-08')).toBe(true);
	});

	it('returns the previous Monday for a Sunday', () => {
		const result = getWeekStart(new Date('2024-01-14T12:00:00'));
		expect(result.toISOString().startsWith('2024-01-08')).toBe(true);
	});

	it('sets time to midnight', () => {
		const result = getWeekStart(new Date('2024-01-10T15:30:00'));
		expect(result.getHours()).toBe(0);
		expect(result.getMinutes()).toBe(0);
		expect(result.getSeconds()).toBe(0);
	});
});

// ── formatMinutes ─────────────────────────────────────────────────────────────

describe('formatMinutes', () => {
	it('formats hours only', () => {
		expect(formatMinutes(120)).toBe('2h');
	});

	it('formats minutes only', () => {
		expect(formatMinutes(45)).toBe('45m');
	});

	it('formats hours and minutes', () => {
		expect(formatMinutes(150)).toBe('2h 30m');
	});

	it('handles zero', () => {
		expect(formatMinutes(0)).toBe('0m');
	});

	it('formats 1 minute', () => {
		expect(formatMinutes(1)).toBe('1m');
	});

	it('formats 1 hour', () => {
		expect(formatMinutes(60)).toBe('1h');
	});
});

// ── shortDayName ──────────────────────────────────────────────────────────────

describe('shortDayName', () => {
	it('returns Mon for a Monday', () => {
		expect(shortDayName('2024-01-08')).toBe('Mon');
	});

	it('returns Sun for a Sunday', () => {
		expect(shortDayName('2024-01-14')).toBe('Sun');
	});

	it('returns Sat for a Saturday', () => {
		expect(shortDayName('2024-01-13')).toBe('Sat');
	});
});
