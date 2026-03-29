import { db } from '../database.js';
import type { Category } from '../types.js';

export const CategoryRepository = {
	async getAll(): Promise<Category[]> {
		return db.categories.orderBy('priority').reverse().toArray();
	},

	async getById(id: string): Promise<Category | undefined> {
		return db.categories.get(id);
	},

	async create(category: Omit<Category, 'id' | 'createdAt'>): Promise<string> {
		const id = crypto.randomUUID();
		const now = new Date().toISOString();
		await db.categories.add({ ...category, id, createdAt: now });
		return id;
	},

	async update(id: string, patch: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<void> {
		await db.categories.update(id, patch);
	},

	async delete(id: string): Promise<void> {
		await db.categories.delete(id);
	}
};
