<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { initDatabase } from '$lib/db/database.js';
	import { settingsStore } from '$lib/stores/settingsStore.js';
	import { dayTemplateStore } from '$lib/stores/dayTemplateStore.js';
	import { SettingsRepository } from '$lib/db/repositories/SettingsRepository.js';
	import { resolve } from '$app/paths';

	let { children } = $props();

	let ready = $state(false);

	// Do this so svelte's resolve() is happy about the types of href
	type Item = {
		href: '/dashboard' | '/tasks' | '/schedule' | '/categories' | '/settings',
		label: string,
		icon: string,
	}

	const navItems: Item[] = [
		{ href: '/dashboard', label: 'Dashboard', icon: '◈' },
		{ href: '/tasks', label: 'Tasks', icon: '✦' },
		{ href: '/schedule', label: 'Schedule', icon: '⊞' },
		{ href: '/categories', label: 'Categories', icon: '◉' },
		{ href: '/settings', label: 'Settings', icon: '⚙' }
	];

	// Initialise from window immediately so there's no flash on first load.
	let systemDark = $state(
		typeof window !== 'undefined'
			? window.matchMedia('(prefers-color-scheme: dark)').matches
			: false
	);

	// Apply / remove the .dark class on <html> whenever theme or system pref changes.
	$effect(() => {
		const theme = $settingsStore?.theme ?? 'system';
		const isDark = theme === 'dark' || (theme === 'system' && systemDark);
		document.documentElement.classList.toggle('dark', isDark);
	});

	onMount(async () => {
		// Keep systemDark in sync with OS preference.
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		mq.addEventListener('change', (e) => { systemDark = e.matches; });

		await initDatabase();
		await Promise.all([settingsStore.load(), dayTemplateStore.load()]);
		await SettingsRepository.touchLastActive();
		ready = true;
	});
</script>

{#if ready}
	<div class="flex min-h-screen bg-stone-50 text-stone-800">
		<!-- Sidebar -->
		<nav class="flex w-52 flex-col border-r border-stone-200 bg-white px-3 py-6">
			<div class="mb-8 px-2">
				<h1 class="text-lg font-semibold tracking-tight text-stone-700">plan-inator</h1>
				<p class="text-xs text-stone-400">gentle productivity</p>
			</div>

			<ul class="flex flex-col gap-1">
				{#each navItems as item (item)}
					<li>
						<a
							href={resolve(item.href)}
							class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
								{$page.url.pathname.startsWith(item.href)
								? 'bg-amber-50 font-medium text-amber-700'
								: 'text-stone-500 hover:bg-stone-50 hover:text-stone-700'}"
						>
							<span class="text-base leading-none">{item.icon}</span>
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<!-- Main content -->
		<main class="flex-1 overflow-auto">
			{@render children()}
		</main>
	</div>
{:else}
	<div class="flex min-h-screen items-center justify-center bg-stone-50">
		<p class="text-stone-400">Loading…</p>
	</div>
{/if}
