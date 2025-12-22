<script lang="ts">
  import { ddragon } from "$lib/stores/ddragon";

  let {
    value = $bindable(""),
    options,
    disabled = false,
    placeholder = "Nom du champion...",
    onSubmit,
  }: {
    value?: string;
    options: string[];
    disabled?: boolean;
    placeholder?: string;
    onSubmit: (championIdOrInput: string) => void;
  } = $props();

  let open = $state(false);
  let focused = $state(false);
  let activeIndex = $state(0);
  let blurTimer: ReturnType<typeof setTimeout> | undefined;

  let query = $derived(value.trim().toLowerCase());
  let filtered = $derived.by(() => {
    if ($ddragon.status !== "ready") return options;
    if (!query) return options;
    return options.filter((id) => {
      const name = ($ddragon.championsByKey[id]?.name ?? "").toLowerCase();
      return name.startsWith(query);
    });
  });

  let exactMatchId = $derived.by(() => {
    if ($ddragon.status !== "ready") return undefined;
    if (!query) return undefined;
    return options.find(
      (id) =>
        ($ddragon.championsByKey[id]?.name ?? "").toLowerCase() === query ||
        id.toLowerCase() === query
    );
  });

  let canSubmit = $derived.by(() =>
    open ? filtered.length > 0 : exactMatchId != null
  );

  $effect(() => {
    if (!open) activeIndex = 0;
    else if (activeIndex >= filtered.length) activeIndex = 0;
  });

  function openIfUseful() {
    if (disabled) {
      open = false;
      return;
    }
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

  function commit(selectedId?: string) {
    const id = selectedId ?? exactMatchId;
    if (!id) return;
    const name =
      $ddragon.status === "ready"
        ? ($ddragon.championsByKey[id]?.name ?? id)
        : id;
    value = name;
    open = false;
    activeIndex = 0;
    onSubmit(id);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (disabled) return;

    if (e.key === "Enter") {
      e.preventDefault();
      const selectedId = open ? filtered[activeIndex] : undefined;
      commit(selectedId);
      return;
    }

    if (e.key === "Escape") {
      open = false;
      return;
    }

    if (e.key === "ArrowDown") {
      if (!open) open = true;
      activeIndex = Math.min(filtered.length - 1, activeIndex + 1);
      e.preventDefault();
      return;
    }

    if (e.key === "ArrowUp") {
      if (!open) open = true;
      activeIndex = Math.max(0, activeIndex - 1);
      e.preventDefault();
      return;
    }
  }
</script>

<div class="wrap" onpointerdown={() => cancelClose()}>
  <div class="field">
    <input
      class="input"
      {placeholder}
      bind:value
      {disabled}
      autocomplete="off"
      role="combobox"
      aria-expanded={open}
      aria-controls="champion-listbox"
      onfocus={() => {
        focused = true;
        openIfUseful();
      }}
      onblur={() => {
        focused = false;
        closeSoon();
      }}
      oninput={() => {
        activeIndex = 0;
        openIfUseful();
      }}
      onkeydown={onKeyDown}
    />
    <button
      class="iconButton iconButtonPrimary"
      type="button"
      disabled={disabled || !canSubmit}
      onclick={() => commit(open ? filtered[activeIndex] : undefined)}
      aria-label="Soumettre"
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

  {#if open}
    <div id="champion-listbox" class="menu" role="listbox">
      {#each filtered.slice(0, 12) as id, i (id)}
        {@const champ =
          $ddragon.status === "ready" ? $ddragon.championsByKey[id] : undefined}
        {@const iconUrl =
          $ddragon.status === "ready" && $ddragon.version
            ? `https://ddragon.leagueoflegends.com/cdn/${$ddragon.version}/img/champion/${id}.png`
            : undefined}
        <div
          class={`item ${i === activeIndex ? "active" : ""}`}
          role="option"
          aria-selected={i === activeIndex}
          onpointerdown={(e) => {
            e.preventDefault();
            commit(id);
          }}
          onpointerenter={() => {
            activeIndex = i;
          }}
        >
          {#if iconUrl}
            <img class="icon" src={iconUrl} alt={champ?.name ?? id} />
          {:else}
            <div class="icon" aria-hidden="true"></div>
          {/if}
          <div class="text">
            <div class="name">{champ?.name ?? id}</div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .wrap {
    position: relative;
    width: min(300px, 100%);
  }

  .field {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .input {
    flex: 1;
  }

  .menu {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 8px);
    padding: 6px;
    border-radius: 14px;
    background: rgba(10, 13, 20, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(10px);
    z-index: 20;
    max-height: 360px;
    overflow: auto;
  }

  .item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px 10px;
    border-radius: 12px;
    cursor: pointer;
  }

  .item:hover,
  .item.active {
    background: rgba(99, 102, 241, 0.14);
  }

  .icon {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    flex: none;
  }

  .text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .name {
    font-size: 14px;
    font-weight: 650;
    letter-spacing: -0.01em;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
