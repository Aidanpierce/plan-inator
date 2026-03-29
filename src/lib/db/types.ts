// ============================================================
// Core domain types for Plan-inator
// ============================================================

// --- Tasks ---

export type TaskType = 'assignment' | 'study' | 'general';
export type TaskStatus = 'backlog' | 'active' | 'completed' | 'abandoned';

export interface Task {
	id: string;
	title: string;
	description?: string;
	categoryId: string;
	type: TaskType;
	status: TaskStatus;

	// Time estimation
	estimatedMinutes?: number;
	systemEstimateMinutes?: number;
	estimateConfidence?: number; // 0–1

	// Scheduling
	deadline?: string; // ISO date (YYYY-MM-DD)
	scheduledDate?: string; // ISO date
	priority?: number; // Overrides category priority if set

	// Tracking
	isOverdue: boolean;
	createdAt: string; // ISO datetime
	updatedAt: string;
	completedAt?: string;
	abandonedAt?: string;
}

// --- Time Entries ---

export interface TimeEntry {
	id: string;
	taskId: string;
	startedAt: string; // ISO datetime
	endedAt?: string; // null if currently active
	durationMinutes?: number; // Computed on end
	notes?: string;
}

// --- Categories ---

export interface Category {
	id: string;
	name: string;
	color: string; // hex or tailwind color name
	icon?: string;
	priority: number; // Higher = more important for scheduling (1–10)
	isAutoDetected: boolean;
	parentCategoryId?: string;
	createdAt: string;
}

// --- Day Templates & Commitments ---

export interface Commitment {
	id: string;
	dayTemplateId: string;
	name: string;
	durationMinutes: number;
	categoryId?: string;
	startTime?: string; // HH:MM, optional (budget doesn't need exact times)
}

export interface DayTemplate {
	id: string;
	name: string; // e.g. "Monday", "Weekday", "Weekend"
	dayOfWeek?: number; // 0 = Sunday … 6 = Saturday; undefined = one-off
	sleepHours: number;
	personalHours: number; // Hygiene, meals, commute, downtime
	// commitments are stored separately in the commitments table
	createdAt: string;
}

// A DayTemplate with its commitments included (for computation)
export interface DayTemplateWithCommitments extends DayTemplate {
	commitments: Commitment[];
}

// --- Productivity ---

export interface ProductivitySnapshot {
	id: string;
	date: string; // ISO date
	availableMinutes: number;
	productiveMinutes: number;
	factor: number; // productiveMinutes / availableMinutes
	categoryBreakdown: Record<string, number>; // categoryId -> minutes
}

// --- Warnings ---

export type WarningTriggerType =
	| 'deadline_approaching'
	| 'no_progress'
	| 'overdue'
	| 'estimate_exceeded'
	| 'category_neglected';

export type WarningSeverity = 'gentle' | 'reminder' | 'nudge';

export interface WarningRule {
	id: string;
	rulesetId: string;
	triggerType: WarningTriggerType;
	params: {
		daysBeforeDeadline?: number;
		hoursWithoutProgress?: number;
		daysAfterDeadline?: number;
		percentOverEstimate?: number;
		daysNeglected?: number;
	};
	message?: string; // Custom template; {{task}} and {{category}} interpolated
	severity: WarningSeverity;
}

export interface WarningRuleset {
	id: string;
	name: string;
	isPreset: boolean;
	createdAt: string;
}

export interface WarningAssignment {
	id: string;
	rulesetId: string;
	targetType: 'category' | 'task' | 'global';
	targetId?: string; // categoryId or taskId; undefined for global
}

// --- Settings ---

export interface UserSettings {
	id: 'singleton';
	defaultSleepHours: number;
	defaultPersonalHours: number;
	welcomeBackThresholdDays: number;
	lastActiveAt: string; // ISO datetime
	notificationsEnabled: boolean;
	theme: 'light' | 'dark' | 'system';
	productivityFactorOverride?: number; // Manual override 0–1
}

// --- Computed / view types (not stored) ---

export interface DailyBudget {
	date: string; // ISO date
	rawAvailableMinutes: number; // Before productivity factor
	effectiveAvailableMinutes: number; // After productivity factor
	sleepMinutes: number;
	personalMinutes: number;
	commitmentMinutes: number;
	productivityFactor: number;
}

export interface WeeklyBudget {
	weekStart: string; // ISO date of Monday
	days: DailyBudget[];
	totalRawMinutes: number;
	totalEffectiveMinutes: number;
}

export interface ScheduledTask {
	task: Task;
	scheduledDate: string; // ISO date
	estimatedDurationMinutes: number;
}

export interface ScheduleResult {
	scheduled: ScheduledTask[];
	unschedulable: Task[];
}

export interface Warning {
	task: Task;
	rule: WarningRule;
	message: string;
	severity: WarningSeverity;
	firedAt: string; // ISO datetime
}

export interface WelcomeBackState {
	daysSinceLastActive: number;
	activeTasks: Task[];
	overdueTasks: Task[];
}
