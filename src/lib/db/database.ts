import Dexie, { type Table } from 'dexie';
import type {
	Task,
	TimeEntry,
	Category,
	DayTemplate,
	Commitment,
	ProductivitySnapshot,
	WarningRuleset,
	WarningRule,
	WarningAssignment,
	UserSettings
} from './types.js';

export class PlanInatorDatabase extends Dexie {
	tasks!: Table<Task>;
	timeEntries!: Table<TimeEntry>;
	categories!: Table<Category>;
	dayTemplates!: Table<DayTemplate>;
	commitments!: Table<Commitment>;
	productivitySnapshots!: Table<ProductivitySnapshot>;
	warningRulesets!: Table<WarningRuleset>;
	warningRules!: Table<WarningRule>;
	warningAssignments!: Table<WarningAssignment>;
	settings!: Table<UserSettings>;

	constructor() {
		super('PlanInatorDB');

		this.version(1).stores({
			tasks: 'id, categoryId, status, deadline, scheduledDate, createdAt, updatedAt',
			timeEntries: 'id, taskId, startedAt, endedAt',
			categories: 'id, name, priority, parentCategoryId',
			dayTemplates: 'id, dayOfWeek',
			commitments: 'id, dayTemplateId',
			productivitySnapshots: 'id, date',
			warningRulesets: 'id, isPreset',
			warningRules: 'id, rulesetId',
			warningAssignments: 'id, rulesetId, targetType, targetId',
			settings: 'id'
		});
	}
}

export const db = new PlanInatorDatabase();

// Seed default settings and warning presets on first load
export async function initDatabase(): Promise<void> {
	const existing = await db.settings.get('singleton');
	if (existing) return;

	const now = new Date().toISOString();

	// Default settings
	await db.settings.add({
		id: 'singleton',
		defaultSleepHours: 8,
		defaultPersonalHours: 3,
		welcomeBackThresholdDays: 3,
		lastActiveAt: now,
		notificationsEnabled: false,
		theme: 'system'
	});

	// Default day templates: weekday and weekend
	const weekdayId = crypto.randomUUID();
	const weekendId = crypto.randomUUID();

	await db.dayTemplates.bulkAdd([
		{
			id: weekdayId,
			name: 'Weekday',
			dayOfWeek: undefined, // Applied to Mon–Fri via logic
			sleepHours: 8,
			personalHours: 3,
			createdAt: now
		},
		{
			id: weekendId,
			name: 'Weekend',
			dayOfWeek: undefined,
			sleepHours: 9,
			personalHours: 5,
			createdAt: now
		}
	]);

	// Preset warning rulesets
	const relaxedId = crypto.randomUUID();
	const studiousId = crypto.randomUUID();
	const chillId = crypto.randomUUID();

	await db.warningRulesets.bulkAdd([
		{ id: relaxedId, name: 'Relaxed', isPreset: true, createdAt: now },
		{ id: studiousId, name: 'Studious', isPreset: true, createdAt: now },
		{ id: chillId, name: 'Chill', isPreset: true, createdAt: now }
	]);

	await db.warningRules.bulkAdd([
		// Relaxed preset
		{
			id: crypto.randomUUID(),
			rulesetId: relaxedId,
			triggerType: 'deadline_approaching',
			params: { daysBeforeDeadline: 2 },
			severity: 'gentle'
		},
		{
			id: crypto.randomUUID(),
			rulesetId: relaxedId,
			triggerType: 'no_progress',
			params: { hoursWithoutProgress: 72 },
			severity: 'gentle'
		},
		{
			id: crypto.randomUUID(),
			rulesetId: relaxedId,
			triggerType: 'overdue',
			params: { daysAfterDeadline: 1 },
			severity: 'reminder'
		},

		// Studious preset
		{
			id: crypto.randomUUID(),
			rulesetId: studiousId,
			triggerType: 'deadline_approaching',
			params: { daysBeforeDeadline: 5 },
			severity: 'gentle'
		},
		{
			id: crypto.randomUUID(),
			rulesetId: studiousId,
			triggerType: 'deadline_approaching',
			params: { daysBeforeDeadline: 1 },
			severity: 'nudge'
		},
		{
			id: crypto.randomUUID(),
			rulesetId: studiousId,
			triggerType: 'no_progress',
			params: { hoursWithoutProgress: 48 },
			severity: 'reminder'
		},
		{
			id: crypto.randomUUID(),
			rulesetId: studiousId,
			triggerType: 'estimate_exceeded',
			params: { percentOverEstimate: 50 },
			severity: 'gentle'
		},

		// Chill preset
		{
			id: crypto.randomUUID(),
			rulesetId: chillId,
			triggerType: 'deadline_approaching',
			params: { daysBeforeDeadline: 1 },
			severity: 'gentle'
		},
		{
			id: crypto.randomUUID(),
			rulesetId: chillId,
			triggerType: 'overdue',
			params: { daysAfterDeadline: 3 },
			severity: 'gentle'
		}
	]);

	// Apply Relaxed preset globally by default
	await db.warningAssignments.add({
		id: crypto.randomUUID(),
		rulesetId: relaxedId,
		targetType: 'global'
	});
}
