import { writable } from 'svelte/store';
import type { UserSettings } from '../db/types.js';
import { SettingsRepository } from '../db/repositories/SettingsRepository.js';

function createSettingsStore() {
	const { subscribe, set, update } = writable<UserSettings | null>(null);

	return {
		subscribe,

		async load() {
			const settings = await SettingsRepository.get();
			set(settings);
		},

		async updateSettings(patch: Partial<Omit<UserSettings, 'id'>>) {
			await SettingsRepository.update(patch);
			update((s) => (s ? { ...s, ...patch } : s));
		}
	};
}

export const settingsStore = createSettingsStore();
