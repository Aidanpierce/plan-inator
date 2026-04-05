<script lang="ts">
	import { derived } from 'svelte/store';
	import { dayTemplateStore } from '$lib/stores/dayTemplateStore.js';
	import { settingsStore } from '$lib/stores/settingsStore.js';
	import { productivityStore, productivityFactor } from '$lib/stores/productivityStore.js';
	import {
		calculateWeeklyBudget,
		getWeekStart,
		formatMinutes,
		shortDayName
	} from '$lib/services/timeBudget.js';
	import { productivityWindowLabel } from '$lib/services/productivityFactor.js';
	import { resolve } from '$app/paths';

	// Use the real rolling productivity factor; fall back to user override if set
	const effectiveFactor = derived(
		[productivityFactor, settingsStore],
		([$factor, $settings]) => $settings?.productivityFactorOverride ?? $factor
	);

	const weeklyBudget = derived(
		[dayTemplateStore, effectiveFactor],
		([$templates, $factor]) => {
			if ($templates.length === 0) return null;
			const weekStart = getWeekStart(new Date());
			return calculateWeeklyBudget(weekStart, $templates, $factor);
		}
	);

	const todayBudget = derived(weeklyBudget, ($weekly) => {
		if (!$weekly) return null;
		const todayIso = new Date().toISOString().split('T')[0];
		return $weekly.days.find((d) => d.date === todayIso) ?? $weekly.days[0];
	});

	// Last 14 days of snapshots for the trend sparkline, sorted oldest → newest
	const trendData = derived(productivityStore, ($snapshots) =>
		[...$snapshots].sort((a, b) => a.date.localeCompare(b.date)).slice(-14)
	);

	function pct(value: number): string {
		return `${Math.round(value * 100)}%`;
	}

	function factorColorClass(factor: number): string {
		if (factor >= 0.7) return 'text-green-600';
		if (factor >= 0.4) return 'text-amber-600';
		return 'text-stone-400';
	}
</script>

<div class="p-8">
	<header class="mb-8">
		<h2 class="text-2xl font-semibold text-stone-800">Dashboard</h2>
		<h1 class="text-lg font-semibold tracking-tight text-stone-700">plan-inator</h1>
		<p class="mt-1 text-sm text-stone-400">
			{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
		</p>
	</header>

	{#if !$weeklyBudget}
		<div class="rounded-xl border border-stone-200 bg-white p-8 text-center">
			<p class="text-stone-500">No day templates configured yet.</p>
			<a
				href={resolve('/settings')}
				class="mt-3 inline-block rounded-lg bg-amber-100 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-200"
			>
				Set up your schedule →
			</a>
		</div>
	{:else}
		<!-- Today's budget -->
		{#if $todayBudget}
			<section class="mb-8">
				<h3 class="mb-3 text-sm font-medium uppercase tracking-wide text-stone-400">Today</h3>
				<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
					<div class="rounded-xl border border-stone-200 bg-white p-5">
						<p class="text-xs text-stone-400">Available time</p>
						<p class="mt-1 text-2xl font-semibold text-stone-700">
							{formatMinutes($todayBudget.effectiveAvailableMinutes)}
						</p>
						<p class="mt-0.5 text-xs text-stone-400">
							of {formatMinutes($todayBudget.rawAvailableMinutes)} raw
						</p>
					</div>

					<div class="rounded-xl border border-stone-200 bg-white p-5">
						<p class="text-xs text-stone-400">Productivity factor</p>
						<p class="mt-1 text-2xl font-semibold {factorColorClass($effectiveFactor)}">
							{pct($effectiveFactor)}
						</p>
						<p class="mt-0.5 text-xs text-stone-400">
							{productivityWindowLabel($productivityStore)}
						</p>
					</div>

					<div class="rounded-xl border border-stone-200 bg-white p-5">
						<p class="text-xs text-stone-400">Sleep</p>
						<p class="mt-1 text-2xl font-semibold text-stone-700">
							{formatMinutes($todayBudget.sleepMinutes)}
						</p>
					</div>

					<div class="rounded-xl border border-stone-200 bg-white p-5">
						<p class="text-xs text-stone-400">Commitments</p>
						<p class="mt-1 text-2xl font-semibold text-stone-700">
							{formatMinutes($todayBudget.commitmentMinutes + $todayBudget.personalMinutes)}
						</p>
						<p class="mt-0.5 text-xs text-stone-400">personal + scheduled</p>
					</div>
				</div>
			</section>
		{/if}

		<!-- Productivity trend sparkline -->
		{#if $trendData.length > 0}
			<section class="mb-8">
				<h3 class="mb-3 text-sm font-medium uppercase tracking-wide text-stone-400">
					Productivity Trend
				</h3>
				<div class="rounded-xl border border-stone-200 bg-white p-6">
					<div class="mb-4 flex items-baseline gap-3">
						<span class="text-xl font-semibold {factorColorClass($effectiveFactor)}">
							{pct($effectiveFactor)}
						</span>
						<span class="text-sm text-stone-400">
							rolling average · {productivityWindowLabel($productivityStore)}
						</span>
					</div>

					<!-- Bars: one per snapshot day, scaled to max 64px -->
					<div class="flex items-end gap-1">
						{#each $trendData as snapshot (snapshot.date)}
							{@const barFactor =
								snapshot.availableMinutes > 0
									? Math.min(1, snapshot.productiveMinutes / snapshot.availableMinutes)
									: 0}
							{@const isToday = snapshot.date === new Date().toISOString().split('T')[0]}
							<div class="group relative flex flex-1 flex-col items-center">
								<div
									class="w-full rounded-t-sm {isToday ? 'bg-amber-400' : 'bg-stone-200'}"
									style="height: {Math.max(barFactor * 64, 3)}px;"
								></div>
								<!-- Hover tooltip -->
								<div
									class="pointer-events-none absolute bottom-full mb-1 hidden rounded bg-stone-800 px-2 py-1 text-xs whitespace-nowrap text-white group-hover:block"
								>
									{snapshot.date}: {pct(barFactor)}
									({formatMinutes(snapshot.productiveMinutes)})
								</div>
							</div>
						{/each}
					</div>

					<div class="mt-2 flex justify-between text-xs text-stone-400">
						<span>{$trendData[0]?.date}</span>
						<span>Today</span>
					</div>

					{#if $trendData.every((s) => s.productiveMinutes === 0)}
						<p class="mt-4 text-center text-sm text-stone-400">
							Start tracking time on tasks to see your productivity trend here.
						</p>
					{/if}
				</div>
			</section>
		{/if}

		<!-- Weekly overview -->
		<section>
			<h3 class="mb-3 text-sm font-medium uppercase tracking-wide text-stone-400">This Week</h3>
			<div class="rounded-xl border border-stone-200 bg-white p-6">
				<div class="mb-4 flex items-baseline gap-3">
					<span class="text-xl font-semibold text-stone-700">
						{formatMinutes($weeklyBudget.totalEffectiveMinutes)}
					</span>
					<span class="text-sm text-stone-400">
						effective · {formatMinutes($weeklyBudget.totalRawMinutes)} raw
					</span>
				</div>

				<!-- Per-day bars -->
				<div class="flex items-end gap-2">
					{#each $weeklyBudget.days as day (day.date)}
						{@const today = day.date === new Date().toISOString().split('T')[0]}
						{@const maxMinutes = Math.max(...$weeklyBudget.days.map((d) => d.rawAvailableMinutes))}
						{@const barPct = maxMinutes > 0 ? (day.effectiveAvailableMinutes / maxMinutes) * 100 : 0}
						<div class="flex flex-1 flex-col items-center gap-1">
							<span class="text-xs text-stone-400"
								>{formatMinutes(day.effectiveAvailableMinutes)}</span
							>
							<div
								class="w-full rounded-t-md {today ? 'bg-amber-400' : 'bg-stone-200'}"
								style="height: {Math.max(barPct, 4)}px; min-height: 4px; max-height: 80px;"
							></div>
							<span class="text-xs font-medium {today ? 'text-amber-600' : 'text-stone-400'}">
								{shortDayName(day.date)}
							</span>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}
</div>
