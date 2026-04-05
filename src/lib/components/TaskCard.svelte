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
	// @ts-expect-error lucide path mismatch
	import Sparkles from '@lucide/svelte/icons/sparkles';

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

	/** The estimate to show: system estimate takes priority over user estimate. */
	let displayEstimate = $derived(() => {
		if (task.systemEstimateMinutes) {
			return {
				minutes: task.systemEstimateMinutes,
				isSystem: true,
				confidence: task.estimateConfidence ?? 0
			};
		}
		if (task.estimatedMinutes) {
			return { minutes: task.estimatedMinutes, isSystem: false, confidence: null };
		}
		return null;
	});

	function formatEstimate(minutes: number): string {
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		if (h === 0) return `~${m}m`;
		if (m === 0) return `~${h}h`;
		return `~${h}h ${m}m`;
	}

	/** Confidence pill color: high ≥ 0.6, medium ≥ 0.3, low < 0.3 */
	function confidencePillClass(confidence: number): string {
		if (confidence >= 0.6) return 'text-green-600';
		if (confidence >= 0.3) return 'text-amber-500';
		return 'text-stone-400';
	}

	async function complete(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		await taskStore.completeTask(task.id);
	}
</script>

<div
	class="group rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md
		{isOverdue ? 'border-red-200' : 'border-stone-200'}"
>
	<div class="flex items-start gap-3">
		<!-- Complete button -->
		{#if task.status !== 'completed' && task.status !== 'abandoned'}
			<button
				onclick={complete}
				title="Mark as done"
				class="mt-0.5 shrink-0 text-stone-300 transition-colors hover:text-amber-500"
			>
				<CheckCircle2 size={18} />
			</button>
		{/if}

		<!-- Main content -->
		<div class="min-w-0 flex-1">
			{#if href}
				<a {href} class="block">
					<p
						class="font-medium text-stone-800 hover:text-amber-700
							{task.status === 'completed' ? 'line-through text-stone-400' : ''}"
					>
						{task.title}
					</p>
				</a>
			{:else}
				<p
					class="font-medium text-stone-800
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
							{isOverdue ? 'text-red-500' : 'text-stone-400'}"
					>
						<Clock size={11} />
						{deadlineLabel()}
					</span>
				{/if}

				{#if displayEstimate()}
					{@const est = displayEstimate()}
					{#if est}
						<span
							class="flex items-center gap-1 text-xs
								{est.isSystem ? confidencePillClass(est.confidence ?? 0) : 'text-stone-400'}"
							title={est.isSystem
								? `System estimate (${Math.round((est.confidence ?? 0) * 100)}% confidence, ${task.estimateConfidence !== undefined ? 'log-normal model' : ''})`
								: 'Your estimate'}
						>
							{#if est.isSystem}
								<Sparkles size={10} />
							{/if}
							{formatEstimate(est.minutes)}
						</span>
					{/if}
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
					class="text-stone-300 opacity-0 transition-opacity group-hover:opacity-100"
				>
					<ChevronRight size={16} />
				</a>
			{/if}
		</div>
	</div>
</div>
