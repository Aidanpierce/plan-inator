import { db } from '../database.js';
import type { TimeEntry } from '../types.js';

export const TimeEntryRepository = {
	async getForTask(taskId: string): Promise<TimeEntry[]> {
		return db.timeEntries.where('taskId').equals(taskId).sortBy('startedAt');
	},

	async getActive(): Promise<TimeEntry | undefined> {
		const all = await db.timeEntries.toArray();
		return all.find((e) => !e.endedAt);
	},

	async start(taskId: string): Promise<string> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		await db.timeEntries.add({ id, taskId, startedAt: now });
		return id;
	},

	async stop(id: string): Promise<void> {
		const entry = await db.timeEntries.get(id);
		if (!entry) return;
		const endedAt = new Date().toISOString();
		const durationMinutes = Math.round(
			(new Date(endedAt).getTime() - new Date(entry.startedAt).getTime()) / 60000
		);
		await db.timeEntries.update(id, { endedAt, durationMinutes });
	},

	async getTotalMinutes(taskId: string): Promise<number> {
		const entries = await db.timeEntries.where('taskId').equals(taskId).toArray();
		return entries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0);
	},

	async delete(id: string): Promise<void> {
		await db.timeEntries.delete(id);
	}
};
