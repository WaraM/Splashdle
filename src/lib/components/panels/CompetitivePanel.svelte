<script lang="ts">
	import { actions, game } from '$lib/stores/game';
	import { ddragon } from '$lib/stores/ddragon';
	import ChampionAutocomplete from '$lib/components/ChampionAutocomplete.svelte';
	import SplashView from '$lib/components/SplashView.svelte';

	let guess = $state('');

	function getChampionOptions(): string[] {
		if ($game.kind !== 'competitive') return [];
		if ($ddragon.status !== 'ready') return [];

		const progress = $game.room.progress[$game.playerId];
		const index = progress?.currentIndex ?? 0;
		const guesses = progress?.guesses[index] ?? [];
		const solvedIndex = progress?.solves[index]?.attemptIndex;
		const invalidIds = new Set(
			guesses
				.filter((g) => solvedIndex == null || g.attemptIndex !== solvedIndex)
				.map((g) => g.championKey)
		);
		return $ddragon.championKeys.filter((id) => !invalidIds.has(id));
	}
</script>

{#if $game.kind === 'competitive'}
	{@const progress = $game.room.progress[$game.playerId]}
	{@const index = progress?.currentIndex ?? 0}
	{@const puzzle = $game.room.puzzles[index]}
	{@const guesses = progress?.guesses[index] ?? []}
	{@const solvedIndex = progress?.solves[index]?.attemptIndex}
	{@const championOptions = getChampionOptions()}

	<main>
		<div class="headerRow">
			<div class="headerLeft">
				<button class="iconButton" type="button" onclick={() => actions.goLobby()} aria-label="Retour">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M15 18l-6-6 6-6" />
					</svg>
				</button>
				<h2>Mode compétitif</h2>
			</div>
			<p class="muted">{index + 1} / {$game.room.puzzles.length}</p>
		</div>

		{#if $ddragon.status === 'loading' || $game.connection === 'connecting'}
			<p class="muted">Chargement des données…</p>
		{/if}

		<SplashView puzzle={puzzle} alt="Splash art (compétitif)" full={false} />

		<div class="row centerRow">
			<ChampionAutocomplete
				bind:value={guess}
				options={championOptions}
				disabled={solvedIndex != null}
				onSubmit={(idOrInput) => {
					actions.submitChampionGuess(idOrInput);
					guess = '';
				}}
			/>

			<button type="button" onclick={() => actions.newCompetitiveSeries()}>Nouvelle série</button>
		</div>

		{#if guesses.length > 0}
			<div class="attempts">
				{#each [...guesses].reverse() as g}
					{@const champId = g.championKey}
					{@const champ = $ddragon.status === 'ready' ? $ddragon.championsByKey[champId] : undefined}
					{@const iconUrl =
						$ddragon.status === 'ready' && $ddragon.version
							? `https://ddragon.leagueoflegends.com/cdn/${$ddragon.version}/img/champion/${champId}.png`
							: undefined}
					<div class={`attemptCard ${solvedIndex === g.attemptIndex ? 'good' : 'bad'}`}>
						{#if iconUrl}
							<img class="champIcon" src={iconUrl} alt={champ?.name ?? champId} />
						{:else}
							<div class="champIcon" aria-hidden="true"></div>
						{/if}
						<div class="champName">{champ?.name ?? champId}</div>
					</div>
				{/each}
			</div>
		{/if}
	</main>
{/if}
