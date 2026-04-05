import { describe, it, expect } from 'vitest';
import { calculateProductivityFactor, DEFAULT_PRODUCTIVITY_FACTOR } from './productivityFactor.js';
import type { ProductivitySnapshot } from '../db/types.js';

function snap(date: string, productiveMinutes: number, availableMinutes: number): ProductivitySnapshot {
	return {
		id: crypto.randomUUID(),
		date,
		productiveMinutes,
		availableMinutes,
		factor: availableMinutes > 0 ? productiveMinutes / availableMinutes : 0,
		categoryBreakdown: {}
	};
}

describe('calculateProductivityFactor', () => {
	it('returns 0.5 default for empty snapshots', () => {
		expect(calculateProductivityFactor([])).toBe(DEFAULT_PRODUCTIVITY_FACTOR);
	});

	it('calculates factor from a single snapshot', () => {
		const result = calculateProductivityFactor([snap('2026-03-28', 240, 480)]);
		expect(result).toBeCloseTo(0.5, 3);
	});

	it('calculates factor from a single high-productivity snapshot', () => {
		const result = calculateProductivityFactor([snap('2026-03-28', 400, 480)]);
		expect(result).toBeGreaterThan(0.8);
	});

	it('weights recent snapshots more than older ones', () => {
		const old = snap('2026-03-01', 96, 480);   // 20% productivity
		const recent = snap('2026-03-29', 384, 480); // 80% productivity
		const result = calculateProductivityFactor([old, recent]);
		// Should be closer to 80% than the naive average of 50%
		expect(result).toBeGreaterThan(0.6);
	});

	it('clamps result to minimum 0.1', () => {
		const result = calculateProductivityFactor([snap('2026-03-28', 0, 480)]);
		expect(result).toBeGreaterThanOrEqual(0.1);
	});

	it('clamps result to maximum 1.0', () => {
		const result = calculateProductivityFactor([snap('2026-03-28', 480, 480)]);
		expect(result).toBeLessThanOrEqual(1.0);
	});

	it('ignores snapshots with zero available minutes', () => {
		const zero = snap('2026-03-27', 0, 0);
		const normal = snap('2026-03-28', 240, 480);
		const result = calculateProductivityFactor([zero, normal]);
		expect(result).toBeCloseTo(0.5, 3);
	});

	it('averages multiple same-productivity snapshots correctly', () => {
		const snapshots = [
			snap('2026-03-27', 240, 480),
			snap('2026-03-28', 240, 480),
			snap('2026-03-29', 240, 480)
		];
		const result = calculateProductivityFactor(snapshots);
		expect(result).toBeCloseTo(0.5, 2);
	});

	it('handles snapshots provided in any order', () => {
		const a = calculateProductivityFactor([
			snap('2026-03-28', 96, 480),
			snap('2026-03-29', 384, 480)
		]);
		const b = calculateProductivityFactor([
			snap('2026-03-29', 384, 480),
			snap('2026-03-28', 96, 480)
		]);
		expect(a).toBeCloseTo(b, 10);
	});

	it('limits to 14-day window', () => {
		// 20 snapshots: first 6 are very old low-productivity, last 14 are recent high-productivity
		const snapshots: ProductivitySnapshot[] = [];
		for (let i = 20; i > 0; i--) {
			const date = new Date('2026-03-29');
			date.setDate(date.getDate() - i);
			const iso = date.toISOString().split('T')[0];
			// Older than 14 days: 10% productive; recent: 90%
			const productive = i > 14 ? 48 : 432;
			snapshots.push(snap(iso, productive, 480));
		}
		const result = calculateProductivityFactor(snapshots);
		// Should be dominated by the recent 90% days
		expect(result).toBeGreaterThan(0.7);
	});
});
