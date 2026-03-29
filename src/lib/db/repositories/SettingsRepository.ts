import { db } from '../database.js';
import type { UserSettings } from '../types.js';

export const SettingsRepository = {
	async get(): Promise<UserSettings> {
		const settings = await db.settings.get('singleton');
		if (!settings) throw new Error('Settings not initialized — call initDatabase() first');
		return settings;
	},

	async update(patch: Partial<Omit<UserSettings, 'id'>>): Promise<void> {
		await db.settings.update('singleton', patch);
	},

	async touchLastActive(): Promise<void> {
		await db.settings.update('singleton', { lastActiveAt: new Date().toISOString() });
	}
};
