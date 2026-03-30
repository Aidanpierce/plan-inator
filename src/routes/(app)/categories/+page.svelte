<script lang="ts">
	import { categoryStore } from '$lib/stores/categoryStore.js';
	import { taskStore } from '$lib/stores/taskStore.js';
	import { detectCategories } from '$lib/services/categoryAutoDetection.js';
	import type { Category } from '$lib/db/types.js';
	// @ts-expect-error lucide path mismatch
	import Plus from '@lucide/svelte/icons/plus';
	// @ts-expect-error lucide path mismatch
	import Pencil from '@lucide/svelte/icons/pencil';
	// @ts-expect-error lucide path mismatch
	import Trash2 from '@lucide/svelte/icons/trash-2';
	// @ts-expect-error lucide path mismatch
	import Check from '@lucide/svelte/icons/check';
	// @ts-expect-error lucide path mismatch
	import X from '@lucide/svelte/icons/x';
	// @ts-expect-error lucide path mismatch
	import Sparkles from '@lucide/svelte/icons/sparkles';

	// Preset colours to pick from
	const PALETTE = [
		'#f59e0b', // amber
		'#ef4444', // red
		'#3b82f6', // blue
		'#10b981', // emerald
		'#8b5cf6', // violet
		'#f97316', // orange
		'#06b6d4', // cyan
		'#ec4899', // pink
		'#84cc16', // lime
		'#6b7280'  // gray
	];

	// --- New category form ---
	let showForm = $state(false);
	let formName = $state('');
	let formColor = $state(PALETTE[0]);
	let formPriority = $state(5);
	let formError = $state('');
	let saving = $state(false);

	function openForm() {
		showForm = true;
		formName = '';
		formColor = PALETTE[0];
		formPriority = 5;
		formError = '';
	}

	async function submitForm(e: SubmitEvent) {
		e.preventDefault();
		if (!formName.trim()) {
			formError = 'Name is required.';
			return;
		}
		saving = true;
		formError = '';
		try {
			await categoryStore.create({
				name: formName.trim(),
				color: formColor,
				priority: formPriority,
				isAutoDetected: false
			});
			showForm = false;
		} catch {
			formError = 'Something went wrong. Please try again.';
		} finally {
			saving = false;
		}
	}

	// --- Inline edit ---
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let editColor = $state('');
	let editPriority = $state(5);
	let editError = $state('');
	let editSaving = $state(false);

	function startEdit(cat: Category) {
		editingId = cat.id;
		editName = cat.name;
		editColor = cat.color;
		editPriority = cat.priority;
		editError = '';
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveEdit(id: string, e: SubmitEvent) {
		e.preventDefault();
		if (!editName.trim()) {
			editError = 'Name is required.';
			return;
		}
		editSaving = true;
		editError = '';
		try {
			await categoryStore.updateCategory(id, {
				name: editName.trim(),
				color: editColor,
				priority: editPriority
			});
			editingId = null;
		} catch {
			editError = 'Something went wrong. Please try again.';
		} finally {
			editSaving = false;
		}
	}

	async function deleteCategory(id: string, name: string) {
		if (!confirm(`Delete category "${name}"? Tasks in this category will become uncategorized.`)) {
			return;
		}
		await categoryStore.deleteCategory(id);
	}

	// --- Auto-detection ---
	let suggestions = $derived(() => {
		const uncategorized = $taskStore.filter(
			(t) => !t.categoryId && t.status !== 'completed' && t.status !== 'abandoned'
		);
		return detectCategories(uncategorized);
	});

	let dismissedSuggestions = $state<Set<string>>(new Set());

	let visibleSuggestions = $derived(
		suggestions().filter((s) => !dismissedSuggestions.has(s.matchedToken))
	);

	async function acceptSuggestion(name: string, taskIds: string[]) {
		const id = await categoryStore.create({
			name,
			color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
			priority: 5,
			isAutoDetected: true
		});
		// Assign all matching tasks to the new category
		for (const taskId of taskIds) {
			await taskStore.updateTask(taskId, { categoryId: id });
		}
		dismissedSuggestions = new Set([...dismissedSuggestions, name.toLowerCase()]);
	}

	function dismissSuggestion(token: string) {
		dismissedSuggestions = new Set([...dismissedSuggestions, token]);
	}

	// Task counts per category
	function taskCount(categoryId: string): number {
		return $taskStore.filter(
			(t) => t.categoryId === categoryId && t.status !== 'completed' && t.status !== 'abandoned'
		).length;
	}
</script>

<div class="p-8">
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-semibold text-stone-800">Categories</h2>
			<p class="mt-0.5 text-sm text-stone-400">{$categoryStore.length} categories</p>
		</div>
		<button
			onclick={openForm}
			class="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-amber-600"
		>
			<Plus size={16} />
			New category
		</button>
	</div>

	<!-- Auto-detection suggestions -->
	{#if visibleSuggestions.length > 0}
		<div class="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-4">
			<div class="mb-3 flex items-center gap-2">
				<Sparkles size={15} class="text-violet-500" />
				<h3 class="text-sm font-medium text-violet-800">
					Suggested categories
				</h3>
				<span class="text-xs text-violet-500">
					— based on your task titles
				</span>
			</div>
			<div class="flex flex-wrap gap-2">
				{#each visibleSuggestions as suggestion (suggestion.matchedToken)}
					<div
						class="flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-sm"
					>
						<span class="text-stone-700">{suggestion.name}</span>
						<span class="text-xs text-stone-400">
							{suggestion.taskIds.length} task{suggestion.taskIds.length !== 1 ? 's' : ''}
						</span>
						<button
							onclick={() => acceptSuggestion(suggestion.name, suggestion.taskIds)}
							title="Create this category"
							class="rounded-full p-0.5 text-violet-600 transition-colors hover:bg-violet-100"
						>
							<Check size={13} />
						</button>
						<button
							onclick={() => dismissSuggestion(suggestion.matchedToken)}
							title="Dismiss"
							class="rounded-full p-0.5 text-stone-400 transition-colors hover:bg-stone-100"
						>
							<X size={13} />
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- New category form -->
	{#if showForm}
		<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
			<div class="mb-4 flex items-center justify-between">
				<h3 class="font-medium text-stone-800">New category</h3>
				<button
					onclick={() => (showForm = false)}
					class="text-stone-400 hover:text-stone-600"
				>
					<X size={16} />
				</button>
			</div>
			<form onsubmit={submitForm} class="space-y-3">
				<div class="flex gap-3">
					<div class="flex-1">
						<label class="mb-1 block text-xs text-stone-500" for="name-input">Name</label>
						<input
							type="text"
							placeholder="e.g. CS101"
							bind:value={formName}
							class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
							id="name-input"
							/>
					</div>
					<div class="w-24">
						<label class="mb-1 block text-xs text-stone-500" for="priority-input">
							Priority (1–10)
						</label>
						<input
							type="number"
							min="1"
							max="10"
							bind:value={formPriority}
							class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
							id="priority-input"
							/>
					</div>
				</div>

				<div>
					<label class="mb-2 block text-xs text-stone-500" for="color-select">Colour</label>
					<div class="flex flex-wrap gap-2" id="color-select">
						{#each PALETTE as color (color)}
							<button
								type="button"
								onclick={() => (formColor = color)}
								class="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110
									{formColor === color ? 'border-stone-700 scale-110' : 'border-transparent'}"
								style="background-color: {color};"
								title={color}
							></button>
						{/each}
					</div>
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
						{saving ? 'Saving…' : 'Create'}
					</button>
					<button
						type="button"
						onclick={() => (showForm = false)}
						class="rounded-lg px-4 py-2 text-sm text-stone-500 transition-colors hover:bg-stone-100"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Category list -->
	{#if $categoryStore.length === 0}
		<div class="rounded-xl border border-dashed border-stone-200 p-10 text-center">
			<p class="text-stone-400">No categories yet.</p>
			<button
				onclick={openForm}
				class="mt-2 text-sm text-amber-600 hover:underline"
			>
				Create one?
			</button>
		</div>
	{:else}
		<div class="space-y-2">
			{#each $categoryStore as cat (cat.id)}
				{#if editingId === cat.id}
					<!-- Inline edit row -->
					<div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
						<form onsubmit={(e) => saveEdit(cat.id, e)} class="space-y-3">
							<div class="flex gap-3">
								<div class="flex-1">
									<input
										type="text"
										bind:value={editName}
										class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
									/>
								</div>
								<div class="w-24">
									<input
										type="number"
										min="1"
										max="10"
										bind:value={editPriority}
										class="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
									/>
								</div>
							</div>
							<div class="flex flex-wrap gap-2">
								{#each PALETTE as color (color)}
									<button
										type="button"
										aria-label={"Select color: " + color}
										onclick={() => (editColor = color)}
										class="h-6 w-6 rounded-full border-2 transition-transform hover:scale-110
											{editColor === color ? 'border-stone-700 scale-110' : 'border-transparent'}"
										style="background-color: {color};"
									></button>
								{/each}
							</div>
							{#if editError}
								<p class="text-sm text-red-500">{editError}</p>
							{/if}
							<div class="flex gap-2">
								<button
									type="submit"
									disabled={editSaving}
									class="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
								>
									{editSaving ? 'Saving…' : 'Save'}
								</button>
								<button
									type="button"
									onclick={cancelEdit}
									class="rounded-lg px-3 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-100"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				{:else}
					<!-- Display row -->
					<div class="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4">
						<!-- Color swatch -->
						<div
							class="h-9 w-9 shrink-0 rounded-lg"
							style="background-color: {cat.color}22; border: 2px solid {cat.color}44;"
						>
							<div
								class="h-full w-full rounded-lg"
								style="background-color: {cat.color}33;"
							></div>
						</div>

						<!-- Name + meta -->
						<div class="min-w-0 flex-1">
							<p class="font-medium text-stone-800">{cat.name}</p>
							<p class="text-xs text-stone-400">
								Priority {cat.priority} · {taskCount(cat.id)} active task{taskCount(cat.id) !== 1
									? 's'
									: ''}
								{#if cat.isAutoDetected}
									· <span class="text-violet-400">auto-detected</span>
								{/if}
							</p>
						</div>

						<!-- Color indicator -->
						<div
							class="hidden h-2 w-16 rounded-full sm:block"
							style="background-color: {cat.color};"
						></div>

						<!-- Actions -->
						<div class="flex gap-1">
							<button
								onclick={() => startEdit(cat)}
								title="Edit"
								class="rounded-lg p-2 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
							>
								<Pencil size={14} />
							</button>
							<button
								onclick={() => deleteCategory(cat.id, cat.name)}
								title="Delete"
								class="rounded-lg p-2 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-500"
							>
								<Trash2 size={14} />
							</button>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
