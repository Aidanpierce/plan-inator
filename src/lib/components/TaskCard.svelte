<script lang="ts">
	import type { Task, Category } from '$lib/db/types.js';
	import { taskStore } from '$lib/stores/taskStore.js';
	import CategoryBadge from './CategoryBadge.svelte';
	import Timer from './Timer.svelte';
	// @ts-expect-error lucide path mismatch
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	// @ts-expect-error lucide path mismatch
	import Clock from '@lucide/svelte/icons/clock';
	// @ts-expect-error lucide path mismatch
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	let {
		task,
		category,
		href
	}: {
		task: Task;
		category: Category | null | undefined;
		href?: string;
	} = $props();

	let isOverdue = $derived(
		!!task.deadline &&
			task.status !== 'completed' &&
			task.status !== 'abandoned' &&
			new Date(task.deadline + 'T23:59:59') < new Date()
	);

	let deadlineLabel = $derived(() => {
		if (!task.deadline) return null;
		const d = new Date(task.deadline + 'T00:00:00');
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);
		if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
		if (diffDays === 0) return 'Due today';
		if (diffDays === 1) return 'Due tomorrow';
		return `Due ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
	});

	async function complete(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		await taskStore.completeTask(task.id);
	}
</script>

<div
	class="group rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md
		dark:bg-stone-900 dark:hover:shadow-stone-800
		{isOverdue ? 'border-red-200 dark:border-red-900' : 'border-stone-200 dark:border-stone-700'}"
>
	<div class="flex items-start gap-3">
		<!-- Complete button -->
		{#if task.status !== 'completed' && task.status !== 'abandoned'}
			<button
				onclick={complete}
				title="Mark as done"
				class="mt-0.5 shrink-0 text-stone-300 transition-colors hover:text-amber-500 dark:text-stone-600 dark:hover:text-amber-400"
			>
				<CheckCircle2 size={18} />
			</button>
		{/if}

		<!-- Main content -->
		<div class="min-w-0 flex-1">
			{#if href}
				<a {href} class="block">
					<p
						class="font-medium text-stone-800 hover:text-amber-700 dark:text-stone-100 dark:hover:text-amber-400
							{task.status === 'completed' ? 'line-through text-stone-400' : ''}"
					>
						{task.title}
					</p>
				</a>
			{:else}
				<p
					class="font-medium text-stone-800 dark:text-stone-100
						{task.status === 'completed' ? 'line-through text-stone-400' : ''}"
				>
					{task.title}
				</p>
			{/if}

			{#if task.description}
				<p class="mt-0.5 line-clamp-2 text-sm text-stone-400">{task.description}</p>
			{/if}

			<div class="mt-2 flex flex-wrap items-center gap-2">
				<CategoryBadge {category} />

				{#if task.deadline}
					<span
						class="flex items-center gap-1 text-xs
							{isOverdue ? 'text-red-500 dark:text-red-400' : 'text-stone-400 dark:text-stone-500'}"
					>
						<Clock size={11} />
						{deadlineLabel()}
					</span>
				{/if}

				{#if task.estimatedMinutes}
					<span class="text-xs text-stone-400 dark:text-stone-500">
						~{task.estimatedMinutes}min
					</span>
				{/if}
			</div>
		</div>

		<!-- Actions -->
		<div class="flex shrink-0 flex-col items-end gap-2">
			{#if task.status === 'active' || task.status === 'backlog'}
				<Timer taskId={task.id} />
			{/if}
			{#if href}
				<a
					{href}
					class="text-stone-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-stone-600"
				>
					<ChevronRight size={16} />
				</a>
			{/if}
		</div>
	</div>
</div>
