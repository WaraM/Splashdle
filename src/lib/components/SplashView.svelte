<script lang="ts">
  import type { Puzzle } from "$lib/types";

  let {
    puzzle,
    alt = "Splash art",
    full = false,
  }: { puzzle: Puzzle; alt?: string; full?: boolean } = $props();

  let src = $derived(
    `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${puzzle.splash.championKey}_${puzzle.splash.skinNum}.jpg`
  );
  let tx = $derived(`${(0.5 - (full ? 0.5 : puzzle.view.focus.x)) * 100}%`);
  let ty = $derived(`${(0.5 - (full ? 0.5 : puzzle.view.focus.y)) * 100}%`);
  let zoom = $derived(full ? 1 : puzzle.view.zoom);
</script>

<div
  class={`frame ${full ? "full" : ""}`}
  style={`--zoom:${zoom}; --tx:${tx}; --ty:${ty};`}
  aria-label={alt}
>
  <img class="img" {src} {alt} />
</div>

<style>
  .frame {
    position: relative;
    width: min(100%, 560px);
    margin: 0 auto;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    border-radius: 14px;
    background: #0b0e14;
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.42);
  }

  .frame.full {
    width: min(100%, 820px);
    aspect-ratio: 16 / 9;
  }

  .img {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 178%;
    height: auto;
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty)))
      scale(var(--zoom));
    transform-origin: center;
    transition: transform 220ms ease-out;
    user-select: none;
    pointer-events: none;
    filter: saturate(1.05) contrast(1.02);
  }

  .frame.full .img {
    width: 100%;
  }
</style>
