import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

vi.mock('$app/state', () => ({
	page: { params: { id: 'does-not-exist' } }
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

// Store returns tasks, but none match the route param 'does-not-exist'
vi.mock('$lib/stores/taskStore.js', async () => {
	const { readable } = await import('svelte/store');
	return {
		taskStore: {
			subscribe: readable([
				{
					id: 'some-other-id',
					title: 'Other task',
					type: 'general' as const,
					status: 'active' as const,
					createdAt: '2024-01-10T10:00:00.000Z',
					updatedAt: '2024-01-10T10:00:00.000Z'
				}
			]).subscribe,
			updateTask: vi.fn(),
			completeTask: vi.fn(),
			abandonTask: vi.fn(),
			deleteTask: vi.fn()
		}
	};
});

vi.mock('$lib/stores/categoryStore.js', async () => {
	const { readable } = await import('svelte/store');
	return { categoryStore: readable([]) };
});

vi.mock('$lib/stores/timerStore.js', async () => {
	const { readable } = await import('svelte/store');
	return { timerStore: readable({ activeTaskId: null }) };
});

vi.mock('$lib/db/repositories/TimeEntryRepository.js', () => ({
	TimeEntryRepository: {
		getForTask: vi.fn().mockResolvedValue([]),
		getTotalMinutes: vi.fn().mockResolvedValue(0),
		delete: vi.fn().mockResolvedValue(undefined)
	}
}));

describe('Task detail page — task not found', () => {
	it('shows "Task not found" when no task matches the route param', async () => {
		const screen = render(Page);
		await expect.element(screen.getByText('Task not found.')).toBeVisible();
	});
});
