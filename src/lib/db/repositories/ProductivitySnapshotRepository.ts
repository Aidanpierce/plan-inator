import { db } from '../database.js';
import type { ProductivitySnapshot } from '../types.js';

export const ProductivitySnapshotRepository = {
	async getAll(): Promise<ProductivitySnapshot[]> {
		return db.productivitySnapshots.orderBy('date').toArray();
	},

	async getByDate(date: string): Promise<ProductivitySnapshot | undefined> {
		return db.productivitySnapshots.where('date').equals(date).first();
	},

	async getRecent(days: number): Promise<ProductivitySnapshot[]> {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - days);
		const cutoffStr = cutoff.toISOString().split('T')[0];
		return db.productivitySnapshots.where('date').aboveOrEqual(cutoffStr).toArray();
	},

	/** Insert or update a snapshot for the given date. Returns the id. */
	async upsert(snapshot: Omit<ProductivitySnapshot, 'id'>): Promise<string> {
		const existing = await db.productivitySnapshots.where('date').equals(snapshot.date).first();
		if (existing) {
			await db.productivitySnapshots.update(existing.id, snapshot);
			return existing.id;
		}
		const id = crypto.randomUUID();
		await db.productivitySnapshots.add({ ...snapshot, id });
		return id;
	},

	async delete(id: string): Promise<void> {
		await db.productivitySnapshots.delete(id);
	}
};
