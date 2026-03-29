import { db } from '../database.js';
import type { Commitment, DayTemplate, DayTemplateWithCommitments } from '../types.js';

export const DayTemplateRepository = {
	async getAll(): Promise<DayTemplateWithCommitments[]> {
		const templates = await db.dayTemplates.toArray();
		const commitments = await db.commitments.toArray();
		return templates.map((t) => ({
			...t,
			commitments: commitments.filter((c) => c.dayTemplateId === t.id)
		}));
	},

	async getById(id: string): Promise<DayTemplateWithCommitments | undefined> {
		const template = await db.dayTemplates.get(id);
		if (!template) return undefined;
		const commitments = await db.commitments.where('dayTemplateId').equals(id).toArray();
		return { ...template, commitments };
	},

	async create(
		template: Omit<DayTemplate, 'id' | 'createdAt'>,
		commitments: Omit<Commitment, 'id' | 'dayTemplateId'>[] = []
	): Promise<string> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		await db.transaction('rw', db.dayTemplates, db.commitments, async () => {
			await db.dayTemplates.add({ ...template, id, createdAt: now });
			if (commitments.length > 0) {
				await db.commitments.bulkAdd(
					commitments.map((c) => ({ ...c, id: crypto.randomUUID(), dayTemplateId: id }))
				);
			}
		});
		return id;
	},

	async update(
		id: string,
		patch: Partial<Omit<DayTemplate, 'id' | 'createdAt'>>,
		commitments?: Omit<Commitment, 'id' | 'dayTemplateId'>[]
	): Promise<void> {
		await db.transaction('rw', db.dayTemplates, db.commitments, async () => {
			if (Object.keys(patch).length > 0) {
				await db.dayTemplates.update(id, patch);
			}
			if (commitments !== undefined) {
				// Replace all commitments for this template
				await db.commitments.where('dayTemplateId').equals(id).delete();
				if (commitments.length > 0) {
					await db.commitments.bulkAdd(
						commitments.map((c) => ({ ...c, id: crypto.randomUUID(), dayTemplateId: id }))
					);
				}
			}
		});
	},

	async delete(id: string): Promise<void> {
		await db.transaction('rw', db.dayTemplates, db.commitments, async () => {
			await db.dayTemplates.delete(id);
			await db.commitments.where('dayTemplateId').equals(id).delete();
		});
	},

	async addCommitment(
		dayTemplateId: string,
		commitment: Omit<Commitment, 'id' | 'dayTemplateId'>
	): Promise<string> {
		const id = crypto.randomUUID();
		await db.commitments.add({ ...commitment, id, dayTemplateId });
		return id;
	},

	async removeCommitment(commitmentId: string): Promise<void> {
		await db.commitments.delete(commitmentId);
	}
};
