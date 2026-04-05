import { db } from '../database.js';
import type { Task, TaskStatus } from '../types.js';

export const TaskRepository = {
	async getAll(): Promise<Task[]> {
		return db.tasks.orderBy('createdAt').reverse().toArray();
	},

	async getByStatus(status: TaskStatus): Promise<Task[]> {
		return db.tasks.where('status').equals(status).toArray();
	},

	async getById(id: string): Promise<Task | undefined> {
		return db.tasks.get(id);
	},

	async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue'>): Promise<string> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		await db.tasks.add({
			...task,
			id,
			isOverdue: false,
			createdAt: now,
			updatedAt: now
		});
		return id;
	},

	async update(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> {
		const now = new Date().toISOString();
		await db.tasks.update(id, { ...patch, updatedAt: now });
	},

	async delete(id: string): Promise<void> {
		await db.tasks.delete(id);
	},

	async complete(id: string): Promise<void> {
		const now = new Date().toISOString();
		await db.tasks.update(id, { status: 'completed', completedAt: now, updatedAt: now });
	},

	async abandon(id: string): Promise<void> {
		const now = new Date().toISOString();
		await db.tasks.update(id, { status: 'abandoned', abandonedAt: now, updatedAt: now });
	},

	/**
	 * Write system-generated estimate fields directly without touching updatedAt,
	 * so user-visible "last modified" timestamps are not affected.
	 */
	async updateSystemEstimate(
		id: string,
		systemEstimateMinutes: number,
		estimateConfidence: number
	): Promise<void> {
		await db.tasks.update(id, { systemEstimateMinutes, estimateConfidence });
	}
};
