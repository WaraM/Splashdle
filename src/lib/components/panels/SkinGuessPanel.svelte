<script lang="ts">
  import SplashView from "$lib/components/SplashView.svelte";
  import { actions, game } from "$lib/stores/game";
  import { ddragon } from "$lib/stores/ddragon";

  let { onDone }: { onDone?: () => void } = $props();
  let skinName = $state("");
  let open = $state(false);
  let focused = $state(false);
  let activeIndex = $state(0);
  let blurTimer: ReturnType<typeof setTimeout> | undefined;

  function getSkinOptions(): string[] {
    if ($game.kind !== "group" || !$game.room.solve) return [];
    if ($ddragon.status !== "ready") return [];
    const championId = $game.room.puzzle.splash.championKey;
    const champion = $ddragon.championsByKey[championId];
    return champion?.skins?.filter((s) => s.num !== 0).map((s) => s.name) ?? [];
  }

  function resolveSuggestion(
    input: string,
    options: string[]
  ): string | undefined {
    const value = input.trim();
    if (!value) return;
    const lower = value.toLowerCase();
    return (
      options.find((n: string) => n.toLowerCase() === lower) ??
      options.find((n: string) => n.toLowerCase().startsWith(lower)) ??
      value
    );
  }

  function filterSkinOptions(input: string, options: string[]): string[] {
    const value = input.trim();
    if (!value) return options;
    const lower = value.toLowerCase();
    return options.filter((n: string) => n.toLowerCase().startsWith(lower));
  }

  function openIfUseful(filtered: string[]) {
    open = focused && filtered.length > 0;
  }

  function closeSoon() {
    blurTimer = setTimeout(() => {
      open = false;
    }, 80);
  }

  function cancelClose() {
    if (blurTimer) clearTimeout(blurTimer);
    blurTimer = undefined;
  }

  function commit(selected?: string) {
    if ($game.kind !== "group" || !$game.room.solve) return;
    if ($game.room.skinGuess) return;
    const options = getSkinOptions();
    const value = resolveSuggestion(selected ?? skinName, options);
    if (!value) return;
    skinName = value;
    actions.submitSkinGuess(skinName);
    open = false;
    activeIndex = 0;
  }

  $effect(() => {
    if (!open) activeIndex = 0;
  });
</script>

{#if $game.kind === "group" && $game.room.solve}
  {@const championId = $game.room.puzzle.splash.championKey}
  {@const champion =
    $ddragon.status === "ready"
      ? $ddragon.championsByKey[championId]
      : undefined}
  {@const correctSkinName =
    $game.room.skinGuess?.correctSkinName ??
    champion?.skins?.find((s) => s.num === $game.room.puzzle.splash.skinNum)
      ?.name}
  {@const skinOptions = champion?.skins
    ? champion.skins.filter((s) => s.num !== 0).map((s) => s.name)
    : []}
  {@const filteredSkinOptions = filterSkinOptions(skinName, skinOptions)}

  <div class="backdrop">
    <div class="modal">
      <!-- <h3>Trouves le skin</h3> -->
      <SplashView
        puzzle={$game.room.puzzle}
        alt="Splash art complet"
        full={true}
      />

      {#if $game.room.skinGuess}
        <p class={$game.room.skinGuess.correct ? "good" : "bad"}>
          {$game.room.skinGuess.correct ? "Correct" : "Incorrect"} - "{String(
            $game.room.skinGuess.skinName
          )}"
        </p>
        <p class="muted">Bonne reponse: "{correctSkinName ?? "Unknown"}"</p>
        <div class="actions">
          <button
            type="button"
            class="primary"
            onclick={() => actions.newRound()}>Rejouer</button
          >
          <button type="button" class="ghost" onclick={() => actions.goLobby()}
            >Accueil</button
          >
        </div>
      {:else}
        <div class="field" onpointerdown={() => cancelClose()}>
          <div class="skinRow">
            <div class="skinField">
              <input
                placeholder="Nom du skin"
                bind:value={skinName}
                autocomplete="off"
                onfocus={() => {
                  focused = true;
                  openIfUseful(filteredSkinOptions);
                }}
                onblur={() => {
                  focused = false;
                  closeSoon();
                }}
                oninput={() => {
                  activeIndex = 0;
                  openIfUseful(filteredSkinOptions);
                }}
                onkeydown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const selected = open
                      ? filteredSkinOptions[activeIndex]
                      : undefined;
                    commit(selected);
                    return;
                  }
                  if (e.key === "Escape") {
                    open = false;
                    return;
                  }
                  if (e.key === "ArrowDown") {
                    open = true;
                    activeIndex = Math.min(
                      filteredSkinOptions.length - 1,
                      activeIndex + 1
                    );
                    e.preventDefault();
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    open = true;
                    activeIndex = Math.max(0, activeIndex - 1);
                    e.preventDefault();
                    return;
                  }
                }}
              />
              {#if open && filteredSkinOptions.length > 0}
                <div class="skinMenu">
                  {#each filteredSkinOptions as name, i (name)}
                    <div
                      class={`skinItem ${i === activeIndex ? "active" : ""}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      onpointerdown={(e) => {
                        e.preventDefault();
                        commit(name);
                      }}
                      onpointerenter={() => {
                        activeIndex = i;
                      }}
                    >
                      <div class="skinName">{name}</div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
            <button
              class="iconButton iconButtonPrimary"
              type="button"
              onclick={() =>
                commit(open ? filteredSkinOptions[activeIndex] : undefined)}
              aria-label="Valider skin"
              disabled={$game.room.skinGuess != null}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12h12" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(4, 7, 12, 0.65);
    backdrop-filter: blur(6px);
    border-radius: 12px;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    z-index: 40;
    padding: 18px;
  }

  .modal {
    width: min(820px, 100%);
    padding: 18px;
    border-radius: 16px;
    background: rgba(11, 14, 20, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 16px 42px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .skinRow {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: center;
  }

  .skinField {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
    position: relative;
    min-width: 260px;
    max-width: 520px;
    width: 100%;
  }

  .skinMenu {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 4px);
    padding: 6px;
    border-radius: 14px;
    background: rgba(10, 13, 20, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(10px);
    z-index: 2;
    max-height: 360px;
    overflow: auto;
  }

  .skinItem {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    border-radius: 12px;
    cursor: pointer;
  }

  .skinItem:hover,
  .skinItem.active {
    background: rgba(99, 102, 241, 0.14);
  }

  .skinName {
    font-size: 14px;
    font-weight: 650;
    letter-spacing: -0.01em;
    line-height: 1.1;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 8px;
  }
</style>
