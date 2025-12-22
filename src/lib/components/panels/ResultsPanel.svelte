<script lang="ts">
	import { game } from '$lib/stores/game';

	let { onLobby }: { onLobby: () => void } = $props();
</script>

<main>
	<h2>Fin de partie</h2>

	{#if $game.kind === 'results'}
		<p class="muted">Mode: {$game.mode}</p>
	{/if}

	<div class="row">
		<button type="button" onclick={() => onLobby()}>Retour au lobby</button>
	</div>
</main>

