<script lang="ts">
	import type { Category } from '$lib/db/types.js';

	let { category }: { category: Category | null | undefined } = $props();
</script>

{#if category}
	<span
		class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
		style="background-color: {category.color}22; color: {category.color};"
	>
		{category.name}
	</span>
{:else}
	<span
		class="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-400"
	>
		Uncategorized
	</span>
{/if}
