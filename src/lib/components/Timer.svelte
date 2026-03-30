<script lang="ts">
	import { timerStore } from '$lib/stores/timerStore.js';
	// @ts-expect-error lucide path mismatch
	import Play from '@lucide/svelte/icons/play';
	// @ts-expect-error lucide path mismatch
	import Square from '@lucide/svelte/icons/square';

	let { taskId }: { taskId: string } = $props();

	let isActive = $derived($timerStore.activeTaskId === taskId);
	let elapsed = $derived(isActive ? $timerStore.elapsed : 0);

	function formatElapsed(seconds: number): string {
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = seconds % 60;
		if (h > 0) {
			return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
		}
		return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
	}

	async function toggle() {
		if (isActive) {
			await timerStore.stopTimer();
		} else {
			await timerStore.startTimer(taskId);
		}
	}
</script>

<button
	onclick={toggle}
	class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors
		{isActive
		? 'bg-red-50 text-red-600 hover:bg-red-100'
		: 'bg-amber-50 text-amber-700 hover:bg-amber-100'}"
>
	{#if isActive}
		<Square size={12} />
		<span class="tabular-nums">{formatElapsed(elapsed)}</span>
	{:else}
		<Play size={12} />
		<span>Start</span>
	{/if}
</button>
