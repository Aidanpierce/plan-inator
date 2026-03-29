import { writable } from 'svelte/store';
import type { Commitment, DayTemplate, DayTemplateWithCommitments } from '../db/types.js';
import { DayTemplateRepository } from '../db/repositories/DayTemplateRepository.js';

function createDayTemplateStore() {
	const { subscribe, set, update } = writable<DayTemplateWithCommitments[]>([]);

	return {
		subscribe,

		async load() {
			const templates = await DayTemplateRepository.getAll();
			set(templates);
		},

		async create(
			template: Omit<DayTemplate, 'id' | 'createdAt'>,
			commitments: Omit<Commitment, 'id' | 'dayTemplateId'>[] = []
		) {
			const id = await DayTemplateRepository.create(template, commitments);
			const created = await DayTemplateRepository.getById(id);
			if (created) update((ts) => [...ts, created]);
			return id;
		},

		async updateTemplate(
			id: string,
			patch: Partial<Omit<DayTemplate, 'id' | 'createdAt'>>,
			commitments?: Omit<Commitment, 'id' | 'dayTemplateId'>[]
		) {
			await DayTemplateRepository.update(id, patch, commitments);
			const updated = await DayTemplateRepository.getById(id);
			if (updated) {
				update((ts) => ts.map((t) => (t.id === id ? updated : t)));
			}
		},

		async deleteTemplate(id: string) {
			await DayTemplateRepository.delete(id);
			update((ts) => ts.filter((t) => t.id !== id));
		}
	};
}

export const dayTemplateStore = createDayTemplateStore();
