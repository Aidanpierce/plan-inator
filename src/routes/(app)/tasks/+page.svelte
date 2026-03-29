<script lang="ts">
	import { derived } from 'svelte/store';
	import { taskStore } from '$lib/stores/taskStore.js';
	import { categoryStore } from '$lib/stores/categoryStore.js';
	import TaskCard from '$lib/components/TaskCard.svelte';
	import type { TaskType, TaskStatus } from '$lib/db/types.js';
	// @ts-expect-error lucide path mismatch
	import Plus from '@lucide/svelte/icons/plus';
	// @ts-expect-error lucide path mismatch
	import X from '@lucide/svelte/icons/x';

	// --- Derived lists ---
	const activeTasks = derived(taskStore, ($tasks) =>
		$tasks.filter((t) => t.status === 'active')
	);
	const backlogTasks = derived(taskStore, ($tasks) =>
		$tasks.filter((t) => t.status === 'backlog')
	);
	const completedTasks = derived(taskStore, ($tasks) =>
		$tasks.filter((t) => t.status === 'completed')
	);

	function categoryFor(categoryId: string) {
		return $categoryStore.find((c) => c.id === categoryId) ?? null;
	}

	// --- New task form ---
	let showForm = $state(false);
	let formTitle = $state('');
	let formDescription = $state('');
	let formCategoryId = $state('');
	let formType = $state<TaskType>('general');
	let formStatus = $state<TaskStatus>('active');
	let formDeadline = $state('');
	let formEstimatedMinutes = $state('');
	let formError = $state('');
	let saving = $state(false);

	function openForm() {
		showForm = true;
		formTitle = '';
		formDescription = '';
		formCategoryId = '';
		formType = 'general';
		formStatus = 'active';
		formDeadline = '';
		formEstimatedMinutes = '';
		formError = '';
	}

	function closeForm() {
		showForm = false;
	}

	async function submitForm(e: SubmitEvent) {
		e.preventDefault();
		if (!formTitle.trim()) {
			formError = 'Title is required.';
			return;
		}
		saving = true;
		formError = '';
		try {
			await taskStore.create({
				title: formTitle.trim(),
				description: formDescription.trim() || undefined,
				categoryId: formCategoryId,
				type: formType,
				status: formStatus,
				deadline: formDeadline || undefined,
				estimatedMinutes: formEstimatedMinutes ? parseInt(formEstimatedMinutes) : undefined
			});
			closeForm();
		} catch (err) {
			formError = 'Something went wrong. Please try again.';
		} finally {
			saving = false;
		}
	}

	// --- Tabs ---
	type Tab = 'active' | 'backlog' | 'completed';
	let activeTab = $state<Tab>('active');
</script>

<div class="p-8">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-semibold text-stone-800 dark:text-stone-100">Tasks</h2>
			<p class="mt-0.5 text-sm text-stone-400">
				{$activeTasks.length} active · {$backlogTasks.length} in backlog
			</p>
		</div>
		<button
			onclick={openForm}
			class="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-600"
		>
			<Plus size={16} />
			New task
		</button>
	</div>

	<!-- New task form -->
	{#if showForm}
		<div
			class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30"
		>
			<div class="mb-4 flex items-center justify-between">
				<h3 class="font-medium text-stone-800 dark:text-stone-100">New task</h3>
				<button
					onclick={closeForm}
					class="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
				>
					<X size={16} />
				</button>
			</div>

			<form onsubmit={submitForm} class="space-y-3">
				<!-- Title -->
				<div>
					<input
						type="text"
						placeholder="Task title"
						bind:value={formTitle}
						class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
					/>
				</div>

				<!-- Description -->
				<div>
					<textarea
						placeholder="Description (optional)"
						bind:value={formDescription}
						rows={2}
						class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
					></textarea>
				</div>

				<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<!-- Category -->
					<div>
						<label class="mb-1 block text-xs text-stone-500 dark:text-stone-400">Category</label>
						<select
							bind:value={formCategoryId}
							class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
						>
							<option value="">None</option>
							{#each $categoryStore as cat (cat.id)}
								<option value={cat.id}>{cat.name}</option>
							{/each}
						</select>
					</div>

					<!-- Type -->
					<div>
						<label class="mb-1 block text-xs text-stone-500 dark:text-stone-400">Type</label>
						<select
							bind:value={formType}
							class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
						>
							<option value="general">General</option>
							<option value="assignment">Assignment</option>
							<option value="study">Study</option>
						</select>
					</div>

					<!-- Status -->
					<div>
						<label class="mb-1 block text-xs text-stone-500 dark:text-stone-400">Add to</label>
						<select
							bind:value={formStatus}
							class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
						>
							<option value="active">Active</option>
							<option value="backlog">Backlog</option>
						</select>
					</div>

					<!-- Deadline -->
					<div>
						<label class="mb-1 block text-xs text-stone-500 dark:text-stone-400">Deadline</label>
						<input
							type="date"
							bind:value={formDeadline}
							class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
						/>
					</div>
				</div>

				<!-- Estimate -->
				<div class="w-40">
					<label class="mb-1 block text-xs text-stone-500 dark:text-stone-400"
						>Estimated minutes</label
					>
					<input
						type="number"
						min="1"
						placeholder="e.g. 60"
						bind:value={formEstimatedMinutes}
						class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
					/>
				</div>

				{#if formError}
					<p class="text-sm text-red-500">{formError}</p>
				{/if}

				<div class="flex gap-2 pt-1">
					<button
						type="submit"
						disabled={saving}
						class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
					>
						{saving ? 'Saving…' : 'Add task'}
					</button>
					<button
						type="button"
						onclick={closeForm}
						class="rounded-lg px-4 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100 dark:hover:bg-stone-800"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Tabs -->
	<div class="mb-4 flex gap-1 border-b border-stone-200 dark:border-stone-700">
		{#each [['active', 'Active'], ['backlog', 'Backlog'], ['completed', 'Completed']] as [tab, label] (tab)}
			<button
				onclick={() => (activeTab = tab as Tab)}
				class="px-4 py-2 text-sm font-medium transition-colors
					{activeTab === tab
					? 'border-b-2 border-amber-500 text-amber-700 dark:text-amber-400'
					: 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}"
			>
				{label}
				{#if tab === 'active'}
					<span class="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
						{$activeTasks.length}
					</span>
				{:else if tab === 'backlog'}
					<span class="ml-1 rounded-full bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
						{$backlogTasks.length}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Task lists -->
	{#if activeTab === 'active'}
		{#if $activeTasks.length === 0}
			<div class="rounded-xl border border-dashed border-stone-200 p-10 text-center dark:border-stone-700">
				<p class="text-stone-400">No active tasks.</p>
				<button
					onclick={openForm}
					class="mt-2 text-sm text-amber-600 hover:underline dark:text-amber-400"
				>
					Add one?
				</button>
			</div>
		{:else}
			<div class="space-y-3">
				{#each $activeTasks as task (task.id)}
					<TaskCard
						{task}
						category={categoryFor(task.categoryId)}
						href="/tasks/{task.id}"
					/>
				{/each}
			</div>
		{/if}
	{:else if activeTab === 'backlog'}
		{#if $backlogTasks.length === 0}
			<div class="rounded-xl border border-dashed border-stone-200 p-10 text-center dark:border-stone-700">
				<p class="text-stone-400">Backlog is empty.</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each $backlogTasks as task (task.id)}
					<TaskCard
						{task}
						category={categoryFor(task.categoryId)}
						href="/tasks/{task.id}"
					/>
				{/each}
			</div>
		{/if}
	{:else}
		{#if $completedTasks.length === 0}
			<div class="rounded-xl border border-dashed border-stone-200 p-10 text-center dark:border-stone-700">
				<p class="text-stone-400">No completed tasks yet.</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each $completedTasks as task (task.id)}
					<TaskCard
						{task}
						category={categoryFor(task.categoryId)}
						href="/tasks/{task.id}"
					/>
				{/each}
			</div>
		{/if}
	{/if}
</div>
