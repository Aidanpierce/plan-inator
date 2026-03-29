import { writable } from 'svelte/store';
import type { Category } from '../db/types.js';
import { CategoryRepository } from '../db/repositories/CategoryRepository.js';

function createCategoryStore() {
	const { subscribe, set, update } = writable<Category[]>([]);

	return {
		subscribe,

		async load() {
			const categories = await CategoryRepository.getAll();
			set(categories);
		},

		async create(category: Omit<Category, 'id' | 'createdAt'>) {
			const id = await CategoryRepository.create(category);
			const created = await CategoryRepository.getById(id);
			if (created) update((cs) => [created, ...cs]);
			return id;
		},

		async updateCategory(id: string, patch: Partial<Omit<Category, 'id' | 'createdAt'>>) {
			await CategoryRepository.update(id, patch);
			const updated = await CategoryRepository.getById(id);
			if (updated) update((cs) => cs.map((c) => (c.id === id ? updated : c)));
		},

		async deleteCategory(id: string) {
			await CategoryRepository.delete(id);
			update((cs) => cs.filter((c) => c.id !== id));
		}
	};
}

export const categoryStore = createCategoryStore();
