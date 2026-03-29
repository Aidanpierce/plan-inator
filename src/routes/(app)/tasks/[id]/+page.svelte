<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { derived } from 'svelte/store';
	import { taskStore } from '$lib/stores/taskStore.js';
	import { categoryStore } from '$lib/stores/categoryStore.js';
	import { timerStore } from '$lib/stores/timerStore.js';
	import { TimeEntryRepository } from '$lib/db/repositories/TimeEntryRepository.js';
	import CategoryBadge from '$lib/components/CategoryBadge.svelte';
	import Timer from '$lib/components/Timer.svelte';
	import type { TimeEntry, TaskType, TaskStatus } from '$lib/db/types.js';
	// @ts-expect-error lucide path mismatch
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	// @ts-expect-error lucide path mismatch
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
	// @ts-expect-error lucide path mismatch
	import Trash2 from '@lucide/svelte/icons/trash-2';
	// @ts-expect-error lucide path mismatch
	import Pencil from '@lucide/svelte/icons/pencil';
	// @ts-expect-error lucide path mismatch
	import Clock from '@lucide/svelte/icons/clock';
	// @ts-expect-error lucide path mismatch
	import X from '@lucide/svelte/icons/x';

	let taskId = $derived($page.params.id);
	let task = $derived($taskStore.find((t) => t.id === taskId) ?? null);
	let category = $derived(
		task ? ($categoryStore.find((c) => c.id === task!.categoryId) ?? null) : null
	);

	// Time entries
	let timeEntries = $state<TimeEntry[]>([]);
	let totalMinutes = $state(0);

	$effect(() => {
		if (taskId) {
			TimeEntryRepository.getForTask(taskId).then((entries) => {
				timeEntries = entries;
			});
			TimeEntryRepository.getTotalMinutes(taskId).then((m) => {
				totalMinutes = m;
			});
		}
	});

	// Reload time entries after timer stops
	let prevActiveTaskId = $state<string | null>(null);
	$effect(() => {
		const activeId = $timerStore.activeTaskId;
		if (prevActiveTaskId === taskId && activeId !== taskId) {
			// Timer just stopped for this task — reload entries
			TimeEntryRepository.getForTask(taskId).then((entries) => {
				timeEntries = entries;
			});
			TimeEntryRepository.getTotalMinutes(taskId).then((m) => {
				totalMinutes = m;
			});
		}
		prevActiveTaskId = activeId;
	});

	function formatMinutes(minutes: number): string {
		if (minutes < 60) return `${minutes}m`;
		const h = Math.floor(minutes / 60);
		const m = minutes % 60;
		return m > 0 ? `${h}h ${m}m` : `${h}h`;
	}

	function formatDateTime(iso: string): string {
		return new Date(iso).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Edit mode
	let editing = $state(false);
	let editTitle = $state('');
	let editDescription = $state('');
	let editCategoryId = $state('');
	let editType = $state<TaskType>('general');
	let editStatus = $state<TaskStatus>('active');
	let editDeadline = $state('');
	let editEstimatedMinutes = $state('');
	let editError = $state('');
	let saving = $state(false);

	function startEdit() {
		if (!task) return;
		editTitle = task.title;
		editDescription = task.description ?? '';
		editCategoryId = task.categoryId ?? '';
		editType = task.type;
		editStatus = task.status;
		editDeadline = task.deadline ?? '';
		editEstimatedMinutes = task.estimatedMinutes?.toString() ?? '';
		editError = '';
		editing = true;
	}

	async function saveEdit(e: SubmitEvent) {
		e.preventDefault();
		if (!editTitle.trim()) {
			editError = 'Title is required.';
			return;
		}
		saving = true;
		editError = '';
		try {
			await taskStore.updateTask(taskId, {
				title: editTitle.trim(),
				description: editDescription.trim() || undefined,
				categoryId: editCategoryId,
				type: editType,
				status: editStatus,
				deadline: editDeadline || undefined,
				estimatedMinutes: editEstimatedMinutes ? parseInt(editEstimatedMinutes) : undefined
			});
			editing = false;
		} catch {
			editError = 'Something went wrong. Please try again.';
		} finally {
			saving = false;
		}
	}

	async function complete() {
		if (!task) return;
		await taskStore.completeTask(taskId);
	}

	async function abandon() {
		if (!task || !confirm('Mark this task as abandoned?')) return;
		await taskStore.abandonTask(taskId);
	}

	async function deleteTask() {
		if (!task || !confirm('Delete this task? This cannot be undone.')) return;
		await taskStore.deleteTask(taskId);
		goto('/tasks');
	}

	async function deleteEntry(id: string) {
		await TimeEntryRepository.delete(id);
		timeEntries = timeEntries.filter((e) => e.id !== id);
		totalMinutes = timeEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);
	}
</script>

<div class="p-8">
	<!-- Back link -->
	<a
		href="/tasks"
		class="mb-6 inline-flex items-center gap-1.5 text-sm text-stone-400 transition-colors hover:text-stone-600 dark:hover:text-stone-300"
	>
		<ArrowLeft size={14} />
		All tasks
	</a>

	{#if !task}
		<div class="rounded-xl border border-dashed border-stone-200 p-10 text-center dark:border-stone-700">
			<p class="text-stone-400">Task not found.</p>
			<a href="/tasks" class="mt-2 block text-sm text-amber-600 hover:underline dark:text-amber-400">
				Back to tasks
			</a>
		</div>
	{:else if editing}
		<!-- Edit form -->
		<div class="mx-auto max-w-xl">
			<h2 class="mb-4 text-xl font-semibold text-stone-800 dark:text-stone-100">Edit task</h2>
			<form onsubmit={saveEdit} class="space-y-3">
				<input
					type="text"
					placeholder="Task title"
					bind:value={editTitle}
					class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
				/>
				<textarea
					placeholder="Description (optional)"
					bind:value={editDescription}
					rows={3}
					class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
				></textarea>

				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<div>
						<label class="mb-1 block text-xs text-stone-500 dark:text-stone-400">Category</label>
						<select
							bind:value={editCategoryId}
							class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
						>
							<option value="">None</option>
							{#each $categoryStore as cat (cat.id)}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs text-stone-500 dark:text-stone-400">Type</label>
						<select
							bind:value={editType}
							class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
						>
							<option value="general">General</option>
							<option value="assignment">Assignment</option>
							<option value="study">Study</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs text-stone-500 dark:text-stone-400">Status</label>
						<select
							bind:value={editStatus}
							class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
						>
							<option value="active">Active</option>
							<option value="backlog">Backlog</option>
							<option value="completed">Completed</option>
							<option value="abandoned">Abandoned</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs text-stone-500 dark:text-stone-400">Deadline</label>
						<input
							type="date"
							bind:value={editDeadline}
							class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
						/>
					</div>
				</div>

				<div class="w-40">
					<label class="mb-1 block text-xs text-stone-500 dark:text-stone-400">
						Estimated minutes
					</label>
					<input
						type="number"
						min="1"
						placeholder="e.g. 60"
						bind:value={editEstimatedMinutes}
						class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
					/>
				</div>

				{#if editError}
					<p class="text-sm text-red-500">{editError}</p>
				{/if}

				<div class="flex gap-2 pt-1">
					<button
						type="submit"
						disabled={saving}
						class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
					>
						{saving ? 'Saving…' : 'Save changes'}
					</button>
					<button
						type="button"
						onclick={() => (editing = false)}
						class="rounded-lg px-4 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{:else}
		<!-- Task detail view -->
		<div class="mx-auto max-w-xl">
			<!-- Title + actions -->
			<div class="mb-4 flex items-start justify-between gap-4">
				<div>
					<h2
						class="text-xl font-semibold text-stone-800 dark:text-stone-100
							{task.status === 'completed' || task.status === 'abandoned' ? 'line-through text-stone-400' : ''}"
					>
						{task.title}
					</h2>
					{#if task.description}
						<p class="mt-1 text-sm text-stone-500 dark:text-stone-400">{task.description}</p>
					{/if}
				</div>
				<div class="flex shrink-0 gap-1">
					<button
						onclick={startEdit}
						title="Edit"
						class="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
					>
						<Pencil size={15} />
					</button>
					<button
						onclick={deleteTask}
						title="Delete"
						class="rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950"
					>
						<Trash2 size={15} />
					</button>
				</div>
			</div>

			<!-- Meta chips -->
			<div class="mb-6 flex flex-wrap items-center gap-2">
				<CategoryBadge {category} />

				<span
					class="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium capitalize text-stone-500 dark:bg-stone-800 dark:text-stone-400"
				>
					{task.type}
				</span>

				<span
					class="rounded-full px-2.5 py-0.5 text-xs font-medium capitalize
						{task.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : ''}
						{task.status === 'backlog' ? 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400' : ''}
						{task.status === 'completed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : ''}
						{task.status === 'abandoned' ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' : ''}"
				>
					{task.status}
				</span>

				{#if task.deadline}
					<span class="flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500">
						<Clock size={11} />
						Due {new Date(task.deadline).toLocaleDateString(undefined, {
							month: 'short',
							day: 'numeric',
							year: 'numeric'
						})}
					</span>
				{/if}
			</div>

			<!-- Timer + quick actions -->
			{#if task.status === 'active' || task.status === 'backlog'}
				<div class="mb-6 flex flex-wrap items-center gap-3">
					<Timer taskId={task.id} />

					{#if totalMinutes > 0}
						<span class="text-sm text-stone-400 dark:text-stone-500">
							{formatMinutes(totalMinutes)} tracked
							{#if task.estimatedMinutes}
								/ {formatMinutes(task.estimatedMinutes)} est.
							{/if}
						</span>
					{:else if task.estimatedMinutes}
						<span class="text-sm text-stone-400 dark:text-stone-500">
							~{formatMinutes(task.estimatedMinutes)} estimated
						</span>
					{/if}

					<button
						onclick={complete}
						class="flex items-center gap-1.5 rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-amber-50 hover:text-amber-700 dark:bg-stone-800 dark:text-stone-300"
					>
						<CheckCircle2 size={13} />
						Mark done
					</button>

					<button
						onclick={abandon}
						class="rounded-lg px-3 py-1.5 text-xs text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
					>
						Abandon
					</button>
				</div>
			{/if}

			<!-- Time entries -->
			<div>
				<h3 class="mb-3 text-sm font-medium text-stone-600 dark:text-stone-400">Time entries</h3>

				{#if timeEntries.length === 0}
					<p class="text-sm text-stone-400">No time tracked yet.</p>
				{:else}
					<div class="space-y-2">
						{#each timeEntries as entry (entry.id)}
							<div
								class="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
							>
								<div>
									<span class="text-sm text-stone-700 dark:text-stone-300">
										{formatDateTime(entry.startedAt)}
									</span>
									{#if entry.endedAt}
										<span class="mx-1 text-stone-300 dark:text-stone-600">→</span>
										<span class="text-sm text-stone-500 dark:text-stone-400">
											{new Date(entry.endedAt).toLocaleTimeString(undefined, {
												hour: '2-digit',
												minute: '2-digit'
											})}
										</span>
									{:else}
										<span
											class="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300"
										>
											running
										</span>
									{/if}
								</div>
								<div class="flex items-center gap-3">
									{#if entry.durationMinutes != null}
										<span class="text-xs font-medium text-stone-500 dark:text-stone-400">
											{formatMinutes(entry.durationMinutes)}
										</span>
									{/if}
									<button
										onclick={() => deleteEntry(entry.id)}
										class="text-stone-300 transition-colors hover:text-red-400 dark:text-stone-600"
										title="Delete entry"
									>
										<X size={13} />
									</button>
								</div>
							</div>
						{/each}

						{#if totalMinutes > 0}
							<div class="pt-1 text-right text-xs font-medium text-stone-500 dark:text-stone-400">
								Total: {formatMinutes(totalMinutes)}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
