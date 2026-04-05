import { writable, derived } from 'svelte/store';
import type { DayTemplateWithCommitments, ProductivitySnapshot } from '../db/types.js';
import { ProductivitySnapshotRepository } from '../db/repositories/ProductivitySnapshotRepository.js';
import { calculateProductivityFactor, DEFAULT_PRODUCTIVITY_FACTOR } from '../services/productivityFactor.js';
import { computeSnapshotForDate } from '../services/snapshotService.js';
import { db } from '../db/database.js';
import { TaskRepository } from '../db/repositories/TaskRepository.js';

function createProductivityStore() {
	const { subscribe, set, update } = writable<ProductivitySnapshot[]>([]);

	return {
		subscribe,

		/** Load the last 30 days of snapshots from the DB. */
		async load() {
			const snapshots = await ProductivitySnapshotRepository.getRecent(30);
			set(snapshots);
		},

		/**
		 * Compute (or recompute) today's snapshot from live data and persist it.
		 * Call this once on app boot after all other stores have loaded.
		 */
		async computeToday(templates: DayTemplateWithCommitments[]) {
			const today = new Date().toISOString().split('T')[0];
			const [allEntries, allTasks] = await Promise.all([
				db.timeEntries.toArray(),
				TaskRepository.getAll()
			]);

			const snapshotData = computeSnapshotForDate(today, allEntries, allTasks, templates);
			const id = await ProductivitySnapshotRepository.upsert(snapshotData);

			update((snapshots) => {
				const withoutToday = snapshots.filter((s) => s.date !== today);
				return [...withoutToday, { ...snapshotData, id }].sort((a, b) =>
					a.date.localeCompare(b.date)
				);
			});
		}
	};
}

export const productivityStore = createProductivityStore();

/**
 * Rolling 14-day exponentially-weighted productivity factor.
 * Defaults to 0.5 until snapshots are loaded.
 */
export const productivityFactor = derived(productivityStore, ($snapshots) =>
	calculateProductivityFactor($snapshots)
);

export { DEFAULT_PRODUCTIVITY_FACTOR };
