<script lang="ts">
	import { actions, game } from '$lib/stores/game';
</script>

<main>
	<h2>Erreur</h2>
	{#if $game.kind === 'error'}
		<p class="muted">{$game.message}</p>
	{/if}
	<div class="row">
		<button type="button" onclick={() => actions.goLobby()}>Retour au lobby</button>
	</div>
</main>

