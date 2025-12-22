<script lang="ts">
  import { onMount } from "svelte";
  import { DATA_PATCH_OVERRIDE } from "$lib/config";
  import { ddragon, ensureDDragonLoaded } from "$lib/stores/ddragon";
  import { actions } from "$lib/stores/game";

  let choosing = $state(false);
  let dataPatchLabel = $derived.by(() => {
    if (DATA_PATCH_OVERRIDE) return DATA_PATCH_OVERRIDE;
    if ($ddragon.status === "ready" && $ddragon.version)
      return $ddragon.version;
    if ($ddragon.status === "loading") return "Chargement...";
    if ($ddragon.status === "error") return "Erreur de chargement";
    return "En attente";
  });

  onMount(() => {
    if ($ddragon.status === "idle") {
      void ensureDDragonLoaded();
    }
  });
</script>

<main class={`lobby ${choosing ? "hidden" : ""}`}>
  <div class="halo" aria-hidden="true"></div>

  <div class="heading">
    <h1>Splashdle</h1>
    <p class="muted">
      Devine le champion a partir de son splash art. Choisis un mode pour
      commencer.
    </p>
  </div>

  <div class="cta">
    <button
      class="primary"
      type="button"
      onclick={() => {
        choosing = true;
        actions.startLocalGroup();
      }}
    >
      Mode Infini
    </button>
    <button
      class="ghost"
      type="button"
      disabled
      title="Mode quotidien a venir prochainement"
    >
      Mode Quotidien (Bientot !)
    </button>
  </div>

  <div class="footer">
    <p class="muted">Patch LoL {dataPatchLabel}</p>
  </div>
</main>

<style>
  .lobby {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 18px;
    min-height: 420px;
    overflow: hidden;
    transition:
      opacity 160ms ease,
      transform 180ms ease;
  }

  .lobby.hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(12px);
  }

  .halo {
    position: absolute;
    inset: -40%;
    background: radial-gradient(
        circle at 20% 30%,
        rgba(99, 102, 241, 0.18),
        transparent 55%
      ),
      radial-gradient(
        circle at 80% 0%,
        rgba(34, 197, 94, 0.14),
        transparent 45%
      ),
      radial-gradient(
        circle at 60% 80%,
        rgba(255, 255, 255, 0.05),
        transparent 55%
      );
    filter: blur(38px);
    opacity: 0.9;
    pointer-events: none;
  }

  .heading {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 640px;
  }

  h1 {
    font-size: 34px;
    margin: 0;
  }

  .cta {
    width: 100%;
    max-width: 360px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-top: 3rem;
  }

  .primary,
  .ghost {
    width: 100%;
    height: 48px;
    font-size: 15px;
    font-weight: 650;
    letter-spacing: -0.01em;
  }

  .footer {
    margin-top: auto;
    align-self: flex-start;
  }

  .footer p {
    font-size: 13px;
  }

  @media (min-width: 768px) {
    .lobby {
      min-height: 500px;
    }

    h1 {
      font-size: 40px;
    }
  }
</style>
