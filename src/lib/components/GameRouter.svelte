<script lang="ts">
	import { actions, gamePanel } from '$lib/stores/game';
	import CompetitivePanel from '$lib/components/panels/CompetitivePanel.svelte';
	import ErrorPanel from '$lib/components/panels/ErrorPanel.svelte';
	import GroupPanel from '$lib/components/panels/GroupPanel.svelte';
	import LobbyPanel from '$lib/components/panels/LobbyPanel.svelte';
	import ResultsPanel from '$lib/components/panels/ResultsPanel.svelte';
</script>

{#if $gamePanel === 'lobby'}
	<LobbyPanel />
{:else if $gamePanel === 'group'}
	<GroupPanel />
{:else if $gamePanel === 'competitive'}
	<CompetitivePanel />
{:else if $gamePanel === 'results'}
	<ResultsPanel onLobby={() => actions.goLobby()} />
{:else}
	<ErrorPanel />
{/if}
