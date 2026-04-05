<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { initDatabase } from '$lib/db/database.js';
	import { settingsStore } from '$lib/stores/settingsStore.js';
	import { dayTemplateStore } from '$lib/stores/dayTemplateStore.js';
	import { categoryStore } from '$lib/stores/categoryStore.js';
	import { taskStore } from '$lib/stores/taskStore.js';
	import { timerStore } from '$lib/stores/timerStore.js';
	import { productivityStore } from '$lib/stores/productivityStore.js';
	import { SettingsRepository } from '$lib/db/repositories/SettingsRepository.js';
	import { TaskRepository } from '$lib/db/repositories/TaskRepository.js';
	import { TimeEntryRepository } from '$lib/db/repositories/TimeEntryRepository.js';
	import { estimateTaskDuration } from '$lib/services/timeEstimation.js';
	import { get } from 'svelte/store';
	import { resolve } from '$app/paths';
	// Import svelte icons this way so they get tree-shaken away
	// @ts-expect-error linter expects icons to be in @lucide/svelte/dist/icons/<icon> but they're really in @lucide/svelte/icons/<icon>
	import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
	// @ts-expect-error linter expects icons to be in @lucide/svelte/dist/icons/<icon> but they're really in @lucide/svelte/icons/<icon>
	import CheckSquare from '@lucide/svelte/icons/check-square';
	// @ts-expect-error linter expects icons to be in @lucide/svelte/dist/icons/<icon> but they're really in @lucide/svelte/icons/<icon>
	import CalendarDays from '@lucide/svelte/icons/calendar-days';
	// @ts-expect-error linter expects icons to be in @lucide/svelte/dist/icons/<icon> but they're really in @lucide/svelte/icons/<icon>
	import Tag from '@lucide/svelte/icons/tag';
	// @ts-expect-error linter expects icons to be in @lucide/svelte/dist/icons/<icon> but they're really in @lucide/svelte/icons/<icon>
	import Settings from '@lucide/svelte/icons/settings';
	// @ts-expect-error linter expects icons to be in @lucide/svelte/dist/icons/<icon> but they're really in @lucide/svelte/icons/<icon>
	import PanelLeftClose from '@lucide/svelte/icons/panel-left-close';
	// @ts-expect-error linter expects icons to be in @lucide/svelte/dist/icons/<icon> but they're really in @lucide/svelte/icons/<icon>
	import PanelLeftOpen from '@lucide/svelte/icons/panel-left-open';
	import type { Task } from '$lib/db/types';

	let { children } = $props();

	let ready = $state(false);
	let focusMode = $state(
		typeof window !== 'undefined'
			? localStorage.getItem('focusMode') === 'true'
			: false
	);

	// Do this so svelte's resolve() is happy about the types of href
	type Item = {
		href: '/dashboard' | '/tasks' | '/schedule' | '/categories' | '/settings',
		label: string,
		icon: typeof LayoutDashboard,
	}

	const navItems: Item[] = [
		{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
		{ href: '/tasks', label: 'Tasks', icon: CheckSquare },
		{ href: '/schedule', label: 'Schedule', icon: CalendarDays },
		{ href: '/categories', label: 'Categories', icon: Tag },
		{ href: '/settings', label: 'Settings', icon: Settings }
	];

	// Initialise from window immediately so there's no flash on first load.
	let systemDark = $state(
		typeof window !== 'undefined'
			? window.matchMedia('(prefers-color-scheme: dark)').matches
			: false
	);

	// Apply / remove the .dark class on <html> whenever theme or system pref changes.
	// Also persist to localStorage so app.html's inline script can read it on next load.
	$effect(() => {
		const theme = $settingsStore?.theme ?? 'system';
		const isDark = theme === 'dark' || (theme === 'system' && systemDark);
		document.documentElement.classList.toggle('dark', isDark);
		localStorage.setItem('theme', theme);
	});

	function toggleFocusMode() {
		focusMode = !focusMode;
		localStorage.setItem('focusMode', String(focusMode));
	}

	onMount(async () => {
		// Keep systemDark in sync with OS preference.
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', (e) => { systemDark = e.matches; });

		await initDatabase();
		await Promise.all([
			settingsStore.load(),
			dayTemplateStore.load(),
			categoryStore.load(),
			taskStore.load(),
			timerStore.load(),
			productivityStore.load()
		]);

		// Compute today's productivity snapshot from live data
		const templates = get(dayTemplateStore);
		await productivityStore.computeToday(templates);

		// Compute and persist system time estimates for all non-completed tasks
		const [allTasks, allEntries] = await Promise.all([
			TaskRepository.getAll(),
			TimeEntryRepository.getAll()
		]);
		const completedTasks = allTasks.filter((t: Task) => t.status === 'completed');
		const estimateUpdates: Promise<void>[] = [];
		for (const task of allTasks) {
			if (task.status === 'completed' || task.status === 'abandoned') continue;
			const result = estimateTaskDuration(task, completedTasks, allEntries);
			if (!result) continue;
			const changed =
				task.systemEstimateMinutes !== result.estimateMinutes ||
				Math.abs((task.estimateConfidence ?? 0) - result.confidence) > 0.01;
			if (changed) {
				estimateUpdates.push(
					TaskRepository.updateSystemEstimate(task.id, result.estimateMinutes, result.confidence)
				);
			}
		}
		if (estimateUpdates.length > 0) {
			await Promise.all(estimateUpdates);
			// Refresh taskStore so UI sees the updated system estimates
			await taskStore.load();
		}

		await SettingsRepository.touchLastActive();
		ready = true;
	});
</script>

{#if ready}
	<div class="flex h-screen overflow-hidden bg-stone-50 text-stone-800">
		<!-- Sidebar -->
		<nav class="flex flex-col border-r border-stone-200 bg-white transition-all duration-200
			{focusMode ? 'w-14' : 'w-52'}">
			<!-- Brand -->
			<div class="shrink-0 px-3 py-6">
				{#if focusMode}
					<div class="flex justify-center">
						<span class="text-sm font-bold text-amber-600">P</span>
					</div>
				{:else}
					<div class="px-2">
						<h1 class="text-lg font-semibold tracking-tight text-stone-700">plan-inator</h1>
						<p class="text-xs text-stone-400">gentle productivity</p>
					</div>
				{/if}
			</div>

			<!-- Nav items — scrollable if they overflow -->
			<ul class="flex flex-col gap-1 overflow-y-auto px-2 pb-2">
				{#each navItems as item (item)}
					<li>
						<a
							href={resolve(item.href)}
							title={focusMode ? item.label : undefined}
							class="flex items-center rounded-lg py-2 text-sm transition-colors
								{focusMode ? 'justify-center px-2' : 'gap-3 px-3'}
								{$page.url.pathname.startsWith(item.href)
								? 'bg-amber-50 font-medium text-amber-700'
								: 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}"
						>
							<item.icon size={16} />
							{#if !focusMode}
								{item.label}
							{/if}
						</a>
					</li>
				{/each}
			</ul>

			<!-- Focus mode toggle — pinned to bottom -->
			<div class="mt-auto shrink-0 border-t border-stone-200 px-2 py-3">
				<button
					onclick={toggleFocusMode}
					title={focusMode ? 'Expand sidebar' : 'Focus mode'}
					class="flex w-full items-center rounded-lg py-2 text-sm text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-600
						{focusMode ? 'justify-center px-2' : 'gap-3 px-3'}"
				>
					{#if focusMode}
						<PanelLeftOpen size={16} />
					{:else}
						<PanelLeftClose size={16} />
						<span>Collapse Sidebar</span>
					{/if}
				</button>
			</div>
		</nav>

		<!-- Main content — independently scrollable -->
		<main class="flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>
{:else}
	<div class="flex h-screen items-center justify-center bg-stone-50">
		<p class="text-stone-400">Loading…</p>
	</div>
{/if}
