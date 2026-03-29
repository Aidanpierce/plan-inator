import { writable } from 'svelte/store';
import type { Task } from '../db/types.js';
import { TaskRepository } from '../db/repositories/TaskRepository.js';

function createTaskStore() {
	const { subscribe, set, update } = writable<Task[]>([]);

	return {
		subscribe,

		async load() {
			const tasks = await TaskRepository.getAll();
			set(tasks);
		},

		async create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'isOverdue'>) {
			const id = await TaskRepository.create(task);
			const created = await TaskRepository.getById(id);
			if (created) update((ts) => [created, ...ts]);
			return id;
		},

		async updateTask(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) {
			await TaskRepository.update(id, patch);
			const updated = await TaskRepository.getById(id);
			if (updated) update((ts) => ts.map((t) => (t.id === id ? updated : t)));
		},

		async completeTask(id: string) {
			await TaskRepository.complete(id);
			const updated = await TaskRepository.getById(id);
			if (updated) update((ts) => ts.map((t) => (t.id === id ? updated : t)));
		},

		async abandonTask(id: string) {
			await TaskRepository.abandon(id);
			const updated = await TaskRepository.getById(id);
			if (updated) update((ts) => ts.map((t) => (t.id === id ? updated : t)));
		},

		async deleteTask(id: string) {
			await TaskRepository.delete(id);
			update((ts) => ts.filter((t) => t.id !== id));
		}
	};
}

export const taskStore = createTaskStore();
