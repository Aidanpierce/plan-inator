<script lang="ts">
	import { settingsStore } from '$lib/stores/settingsStore.js';
	import { dayTemplateStore } from '$lib/stores/dayTemplateStore.js';
	import type { DayTemplateWithCommitments } from '$lib/db/types.js';
	// Import svelte icons this way so they get tree-shaken away
	// @ts-expect-error linter expects icons to be in @lucide/svelte/dist/icons/<icon> but they're really in @lucide/svelte/icons/<icon>
	import BedDouble from '@lucide/svelte/icons/bed-double';
	// @ts-expect-error linter expects icons to be in @lucide/svelte/dist/icons/<icon> but they're really in @lucide/svelte/icons/<icon>
	import Flower from '@lucide/svelte/icons/flower-2';
	// @ts-expect-error linter expects icons to be in @lucide/svelte/dist/icons/<icon> but they're really in @lucide/svelte/icons/<icon>
	import Calendar from '@lucide/svelte/icons/calendar';

	// --- Settings form ---
	// Don't know why these are here - claude made them but they aren't used
	// let sleepHours = $derived($settingsStore?.defaultSleepHours ?? 8);
	// let personalHours = $derived($settingsStore?.defaultPersonalHours ?? 3);
	// let theme = $derived($settingsStore?.theme ?? 'system');

	async function saveSettings() {
		await settingsStore.updateSettings({
			defaultSleepHours: sleepHoursInput,
			defaultPersonalHours: personalHoursInput,
			theme: themeInput as 'light' | 'dark' | 'system'
		});
		settingsSaved = true;
		setTimeout(() => (settingsSaved = false), 2000);
	}

	let sleepHoursInput = $state(8);
	let personalHoursInput = $state(3);
	let themeInput = $state('system');
	let settingsSaved = $state(false);

	$effect(() => {
		if ($settingsStore) {
			sleepHoursInput = $settingsStore.defaultSleepHours;
			personalHoursInput = $settingsStore.defaultPersonalHours;
			themeInput = $settingsStore.theme;
		}
	});

	// --- Day templates ---
	let showNewTemplate = $state(false);
	let newTemplateName = $state('');
	let newTemplateSleep = $state(8);
	let newTemplatePersonal = $state(3);

	// Commitments for new template
	let newCommitments = $state<{ name: string; durationMinutes: number }[]>([]);

	function addCommitment() {
		newCommitments = [...newCommitments, { name: '', durationMinutes: 60 }];
	}

	function removeCommitment(i: number) {
		newCommitments = newCommitments.filter((_, idx) => idx !== i);
	}

	async function createTemplate() {
		if (!newTemplateName.trim()) return;
		await dayTemplateStore.create(
			{
				name: newTemplateName.trim(),
				sleepHours: newTemplateSleep,
				personalHours: newTemplatePersonal
			},
			newCommitments.filter((c) => c.name.trim())
		);
		newTemplateName = '';
		newTemplateSleep = 8;
		newTemplatePersonal = 3;
		newCommitments = [];
		showNewTemplate = false;
	}

	async function deleteTemplate(id: string) {
		await dayTemplateStore.deleteTemplate(id);
	}

	function totalCommitmentMinutes(template: DayTemplateWithCommitments): number {
		return template.commitments.reduce((sum, c) => sum + c.durationMinutes, 0);
	}

	function availableHours(template: DayTemplateWithCommitments): number {
		const used = (template.sleepHours + template.personalHours) * 60 + totalCommitmentMinutes(template);
		return Math.max(0, (1440 - used) / 60);
	}
</script>

<div class="p-8">
	<header class="mb-8">
		<h2 class="text-2xl font-semibold text-stone-800">Settings</h2>
		<p class="mt-1 text-sm text-stone-400">Configure your schedule and preferences</p>
	</header>

	<!-- General settings -->
	<section class="mb-8">
		<h3 class="mb-4 text-sm font-medium uppercase tracking-wide text-stone-400">General</h3>
		<div class="rounded-xl border border-stone-200 bg-white p-6">
			<div class="grid gap-6 sm:grid-cols-2">
				<div>
					<label class="block text-sm font-medium text-stone-700" for="sleep">
						Default sleep hours
					</label>
					<p class="mb-2 text-xs text-stone-400">How many hours do you sleep per night?</p>
					<input
						id="sleep"
						type="number"
						min="0"
						max="24"
						step="0.5"
						bind:value={sleepHoursInput}
						class="w-32 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-stone-700" for="personal">
						Default personal hours
					</label>
					<p class="mb-2 text-xs text-stone-400">
						Meals, hygiene, commute, downtime — non-productive but necessary time.
					</p>
					<input
						id="personal"
						type="number"
						min="0"
						max="24"
						step="0.5"
						bind:value={personalHoursInput}
						class="w-32 rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-stone-700" for="theme">Theme</label>
					<p class="mb-2 text-xs text-stone-400">Choose your preferred color scheme.</p>
					<select
						id="theme"
						bind:value={themeInput}
						class="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
					>
						<option value="system">System</option>
						<option value="light">Light</option>
						<option value="dark">Dark</option>
					</select>
				</div>
			</div>

			<div class="mt-6 flex items-center gap-3">
				<button
					onclick={saveSettings}
					class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
				>
					Save
				</button>
				{#if settingsSaved}
					<span class="text-sm text-stone-400">Saved ✓</span>
				{/if}
			</div>
		</div>
	</section>

	<!-- Day templates -->
	<section>
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h3 class="text-sm font-medium uppercase tracking-wide text-stone-400">Day Templates</h3>
				<p class="mt-0.5 text-xs text-stone-400">
					Define your typical days to calculate available time.
				</p>
			</div>
			<button
				onclick={() => (showNewTemplate = !showNewTemplate)}
				class="rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-200"
			>
				+ New template
			</button>
		</div>

		<!-- Existing templates -->
		<div class="mb-4 flex flex-col gap-3">
			{#each $dayTemplateStore as template (template.id)}
				<div class="rounded-xl border border-stone-200 bg-white p-5">
					<div class="flex items-start justify-between">
						<div>
							<h4 class="font-medium text-stone-700">{template.name}</h4>
							<div class="mt-1 flex flex-wrap gap-3 text-xs text-stone-400">
								<BedDouble size={16}/>
								<span>{template.sleepHours}h sleep</span>
								<Flower size={16}/>
								<span>{template.personalHours}h personal</span>
								{#if template.commitments.length > 0}
									<Calendar size={16} />
									<span>{(totalCommitmentMinutes(template) / 60).toFixed(1)}h commitments</span>
								{/if}
								<span class="font-medium text-stone-600">
									≈ {availableHours(template).toFixed(1)}h available
								</span>
							</div>

							{#if template.commitments.length > 0}
								<ul class="mt-2 flex flex-col gap-0.5">
									{#each template.commitments as c (c.id)}
										<li class="text-xs text-stone-400">
											· {c.name} ({(c.durationMinutes / 60).toFixed(1)}h)
										</li>
									{/each}
								</ul>
							{/if}
						</div>

						<button
							onclick={() => deleteTemplate(template.id)}
							class="ml-4 rounded p-1 text-stone-300 hover:text-red-400"
							aria-label="Delete template"
						>
							✕
						</button>
					</div>
				</div>
			{/each}

			{#if $dayTemplateStore.length === 0}
				<p class="py-4 text-center text-sm text-stone-400">No templates yet. Add one below.</p>
			{/if}
		</div>

		<!-- New template form -->
		{#if showNewTemplate}
			<div class="rounded-xl border border-amber-200 bg-amber-50 p-5">
				<h4 class="mb-4 font-medium text-stone-700">New Day Template</h4>

				<div class="grid gap-4 sm:grid-cols-3">
					<div class="sm:col-span-3">
						<label class="mb-1 block text-xs font-medium text-stone-600" for="tname">
							Template name
						</label>
						<input
							id="tname"
							type="text"
							placeholder='e.g. "Weekday" or "Monday"'
							bind:value={newTemplateName}
							class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
						/>
					</div>

					<div>
						<label class="mb-1 block text-xs font-medium text-stone-600" for="tsleep">
							Sleep hours
						</label>
						<input
							id="tsleep"
							type="number"
							min="0"
							max="24"
							step="0.5"
							bind:value={newTemplateSleep}
							class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
						/>
					</div>

					<div>
						<label class="mb-1 block text-xs font-medium text-stone-600" for="tpersonal">
							Personal hours
						</label>
						<input
							id="tpersonal"
							type="number"
							min="0"
							max="24"
							step="0.5"
							bind:value={newTemplatePersonal}
							class="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none"
						/>
					</div>
				</div>

				<!-- Commitments -->
				<div class="mt-4">
					<div class="mb-2 flex items-center justify-between">
						<span class="text-xs font-medium text-stone-600">Commitments (classes, meetings, etc.)</span>
						<button
							onclick={addCommitment}
							class="text-xs text-amber-600 hover:text-amber-700"
						>
							+ Add
						</button>
					</div>

					{#each newCommitments as commitment, i (commitment)}
						<div class="mb-2 flex items-center gap-2">
							<input
								type="text"
								placeholder="Name"
								bind:value={commitment.name}
								class="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
							/>
							<input
								type="number"
								min="15"
								step="15"
								placeholder="Minutes"
								bind:value={commitment.durationMinutes}
								class="w-24 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
							/>
							<span class="text-xs text-stone-400">min</span>
							<button onclick={() => removeCommitment(i)} class="text-stone-300 hover:text-red-400">
								✕
							</button>
						</div>
					{/each}
				</div>

				<div class="mt-4 flex gap-2">
					<button
						onclick={createTemplate}
						class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
					>
						Create template
					</button>
					<button
						onclick={() => (showNewTemplate = false)}
						class="rounded-lg px-4 py-2 text-sm text-stone-500 hover:text-stone-700"
					>
						Cancel
					</button>
				</div>
			</div>
		{/if}
	</section>
</div>
