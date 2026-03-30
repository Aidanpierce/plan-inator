import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

// Hoist mock data so it's available inside vi.mock factory closures
const { TASK_ID, mockTask } = vi.hoisted(() => ({
	TASK_ID: 'task-abc-123',
	mockTask: {
		id: 'task-abc-123',
		title: 'Write unit tests',
		description: 'Cover the task detail page',
		type: 'general' as const,
		status: 'active' as const,
		categoryId: undefined,
		deadline: undefined,
		estimatedMinutes: 30,
		createdAt: '2024-01-10T10:00:00.000Z',
		updatedAt: '2024-01-10T10:00:00.000Z'
	}
}));

vi.mock('$app/state', () => ({
	page: { params: { id: TASK_ID } }
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

vi.mock('$lib/stores/taskStore.js', async () => {
	const { readable } = await import('svelte/store');
	return {
		taskStore: {
			subscribe: readable([mockTask]).subscribe,
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

describe('Task detail page', () => {
	it('reads route param from page state (not $page store) and renders task title', async () => {
		const screen = render(Page);
		// The task title should appear — this only works if page.params.id is read correctly
		await expect.element(screen.getByText('Write unit tests')).toBeVisible();
	});

	it('shows task description', async () => {
		const screen = render(Page);
		await expect.element(screen.getByText('Cover the task detail page')).toBeVisible();
	});

	it('shows task status badge', async () => {
		const screen = render(Page);
		await expect.element(screen.getByText('active')).toBeVisible();
	});

	it('shows task type badge', async () => {
		const screen = render(Page);
		await expect.element(screen.getByText('general')).toBeVisible();
	});

});
