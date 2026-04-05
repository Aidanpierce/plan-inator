import { describe, it, expect } from 'vitest';
import { estimateTaskDuration, getActualMinutes, getBestEstimate } from './timeEstimation.js';
import type { Task, TimeEntry } from '../db/types.js';

const NOW = '2026-01-01T00:00:00Z';

function makeTask(
	id: string,
	categoryId: string,
	type: Task['type'] = 'general',
	status: Task['status'] = 'completed',
	estimatedMinutes?: number
): Task {
	return {
		id,
		title: `Task ${id}`,
		categoryId,
		type,
		status,
		isOverdue: false,
		createdAt: NOW,
		updatedAt: NOW,
		completedAt: status === 'completed' ? NOW : undefined,
		estimatedMinutes
	};
}

function makeEntry(taskId: string, durationMinutes: number): TimeEntry {
	return {
		id: crypto.randomUUID(),
		taskId,
		startedAt: NOW,
		endedAt: NOW,
		durationMinutes
	};
}

// ── getActualMinutes ────────────────────────────────────────────────────────

describe('getActualMinutes', () => {
	it('sums all entries for a task', () => {
		const entries = [makeEntry('t1', 30), makeEntry('t1', 45), makeEntry('t2', 60)];
		expect(getActualMinutes('t1', entries)).toBe(75);
	});

	it('returns 0 when no entries exist', () => {
		expect(getActualMinutes('t1', [])).toBe(0);
	});

	it('ignores entries with zero or missing duration', () => {
		const entries: TimeEntry[] = [
			{ id: 'e1', taskId: 't1', startedAt: NOW, durationMinutes: 0 },
			{ id: 'e2', taskId: 't1', startedAt: NOW, durationMinutes: 30 }
		];
		expect(getActualMinutes('t1', entries)).toBe(30);
	});
});

// ── estimateTaskDuration ───────────────────────────────────────────────────

describe('estimateTaskDuration', () => {
	it('returns null with fewer than 3 matching data points', () => {
		const tasks = ['t1', 't2'].map((id) => makeTask(id, 'cat1'));
		const entries = [makeEntry('t1', 60), makeEntry('t2', 90)];
		expect(estimateTaskDuration({ categoryId: 'cat1', type: 'general' }, tasks, entries)).toBeNull();
	});

	it('returns null when tasks have no tracked time', () => {
		const tasks = ['t1', 't2', 't3'].map((id) => makeTask(id, 'cat1'));
		expect(estimateTaskDuration({ categoryId: 'cat1', type: 'general' }, tasks, [])).toBeNull();
	});

	it('estimates the geometric mean from 3 identical durations', () => {
		const tasks = ['t1', 't2', 't3'].map((id) => makeTask(id, 'cat1'));
		const entries = [makeEntry('t1', 60), makeEntry('t2', 60), makeEntry('t3', 60)];
		const result = estimateTaskDuration({ categoryId: 'cat1', type: 'general' }, tasks, entries);
		expect(result).not.toBeNull();
		expect(result!.estimateMinutes).toBe(60);
		expect(result!.dataPoints).toBe(3);
	});

	it('only matches tasks with same category AND type', () => {
		const tasks = [
			makeTask('t1', 'cat1', 'general'),
			makeTask('t2', 'cat1', 'general'),
			makeTask('t3', 'cat1', 'study'),  // different type
			makeTask('t4', 'cat2', 'general') // different category
		];
		const entries = [
			makeEntry('t1', 60),
			makeEntry('t2', 60),
			makeEntry('t3', 120),
			makeEntry('t4', 180)
		];
		// Only t1+t2 match — need 3+ so null
		const result = estimateTaskDuration({ categoryId: 'cat1', type: 'general' }, tasks, entries);
		expect(result).toBeNull();
	});

	it('only uses completed tasks', () => {
		const tasks = [
			makeTask('t1', 'cat1', 'general', 'completed'),
			makeTask('t2', 'cat1', 'general', 'active'),   // active — should be excluded
			makeTask('t3', 'cat1', 'general', 'completed')
		];
		const entries = [makeEntry('t1', 60), makeEntry('t2', 60), makeEntry('t3', 60)];
		// Only t1+t3 are completed — 2 < 3 minimum
		const result = estimateTaskDuration({ categoryId: 'cat1', type: 'general' }, tasks, entries);
		expect(result).toBeNull();
	});

	it('returns confidence between 0 and 1', () => {
		const tasks = ['t1', 't2', 't3', 't4', 't5'].map((id) => makeTask(id, 'cat1'));
		const entries = tasks.map((t) => makeEntry(t.id, 60));
		const result = estimateTaskDuration({ categoryId: 'cat1', type: 'general' }, tasks, entries);
		expect(result!.confidence).toBeGreaterThanOrEqual(0);
		expect(result!.confidence).toBeLessThanOrEqual(1);
	});

	it('consistent durations produce higher confidence than inconsistent ones', () => {
		const consistent = ['c1', 'c2', 'c3', 'c4', 'c5'].map((id) => makeTask(id, 'cat-c'));
		const inconsistent = ['u1', 'u2', 'u3', 'u4', 'u5'].map((id) => makeTask(id, 'cat-u'));

		const entries = [
			...consistent.map((t) => makeEntry(t.id, 60)),
			makeEntry('u1', 10),
			makeEntry('u2', 60),
			makeEntry('u3', 200),
			makeEntry('u4', 500),
			makeEntry('u5', 900)
		];

		const r1 = estimateTaskDuration({ categoryId: 'cat-c', type: 'general' }, consistent, entries);
		const r2 = estimateTaskDuration({ categoryId: 'cat-u', type: 'general' }, inconsistent, entries);

		expect(r1!.confidence).toBeGreaterThan(r2!.confidence);
	});

	it('more data points increase confidence (with same spread)', () => {
		const small = ['a1', 'a2', 'a3'].map((id) => makeTask(id, 'cat-a'));
		const large = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10'].map((id) =>
			makeTask(id, 'cat-b')
		);

		const allEntries = [
			...small.map((t) => makeEntry(t.id, 60)),
			...large.map((t) => makeEntry(t.id, 60))
		];

		const r1 = estimateTaskDuration({ categoryId: 'cat-a', type: 'general' }, small, allEntries);
		const r2 = estimateTaskDuration({ categoryId: 'cat-b', type: 'general' }, large, allEntries);

		expect(r2!.confidence).toBeGreaterThan(r1!.confidence);
	});
});

// ── getBestEstimate ───────────────────────────────────────────────────────

describe('getBestEstimate', () => {
	it('returns null when no data and no user estimate', () => {
		const task = makeTask('t1', 'cat1', 'general', 'active');
		expect(getBestEstimate(task, [], [])).toBeNull();
	});

	it('returns user estimate when no system data', () => {
		const task = makeTask('t1', 'cat1', 'general', 'active', 45);
		const result = getBestEstimate(task, [], []);
		expect(result).toEqual({ minutes: 45, isSystemEstimate: false });
	});

	it('returns system estimate when enough data exists', () => {
		const completed = ['c1', 'c2', 'c3'].map((id) => makeTask(id, 'cat1'));
		const entries = completed.map((t) => makeEntry(t.id, 90));
		const task = makeTask('t1', 'cat1', 'general', 'active', 45);
		const result = getBestEstimate(task, completed, entries);
		expect(result!.isSystemEstimate).toBe(true);
		expect(result!.minutes).toBeCloseTo(90, 0);
	});
});
