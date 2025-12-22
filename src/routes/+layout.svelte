<script lang="ts">
  import favicon from "$lib/assets/favicon.svg";

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="app">
  <div class="container">
    {@render children()}
  </div>
</div>

<style>
  @import "$lib/styles/theme.css";

  :global(html, body) {
    min-height: 100vh;
    box-sizing: border-box;
    background-color: var(--color-bg);
  }

  :global(body) {
    margin: 0;
    color: var(--color-text);
    background: radial-gradient(
        1200px 600px at 20% 0%,
        var(--color-glow-1),
        transparent 55%
      ),
      radial-gradient(
        900px 500px at 85% 20%,
        var(--color-glow-2),
        transparent 60%
      ),
      linear-gradient(180deg, var(--color-bg), var(--color-bg-2));
    background-position: 20% 0%, 85% 20%, 0 0;
    background-repeat: no-repeat;
    animation: bgDrift 24s ease-in-out infinite alternate;
    font-family: var(--font-stack);
  }

  @keyframes bgDrift {
    0% {
      background-position: 20% 0%, 85% 20%, 0 0;
    }
    50% {
      background-position: 21% 2%, 84% 18%, 0 0;
    }
    100% {
      background-position: 19% 1%, 86% 22%, 0 0;
    }
  }
  :global(a) {
    color: inherit;
  }

  .app {
    min-height: 100vh;
    box-sizing: border-box;
    padding: 24px;
    display: flex;
    justify-content: center;
  }

  .container {
    width: 100%;
    max-width: 920px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  :global(main) {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px;
    border-radius: 14px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    backdrop-filter: blur(10px);
  }

  :global(h1) {
    font-size: 28px;
    letter-spacing: -0.02em;
    margin: 0;
  }

  :global(h2) {
    font-size: 18px;
    margin: 0;
    letter-spacing: -0.01em;
  }

  :global(h3) {
    font-size: 14px;
    margin: 0;
    opacity: 0.9;
  }

  :global(p) {
    margin: 0;
    opacity: 0.92;
  }

  :global(.muted) {
    color: var(--color-muted);
  }

  :global(.row) {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  :global(.headerRow) {
    display: flex;
    align-items: center;
    gap: 10px;
    justify-content: space-between;
  }

  :global(.headerLeft) {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  :global(.iconButton) {
    width: 40px;
    min-width: 40px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
  }

  :global(.iconButtonPrimary) {
    background: var(--color-accent-soft);
    border-color: var(--color-accent-soft-2);
  }

  :global(.iconButtonPrimary:hover) {
    background: rgba(199, 155, 59, 0.26);
    border-color: rgba(199, 155, 59, 0.48);
  }

  :global(.primary) {
    background: color-mix(in srgb, var(--color-accent) 70%, #000 30%);
    transition: all 500ms ease;
  }

  :global(.primary:hover) {
    background: var(--color-accent);
  }

  :global(.ghost) {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.14);
    transition: all 500ms ease;
  }

  :global(.ghost:hover) {
    background: rgba(255, 255, 255, 0.28);
  }

  :global(.iconButton svg) {
    width: 18px;
    height: 18px;
  }

  :global(.centerRow) {
    display: flex;
    justify-content: center;
  }

  :global(.attempts) {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    width: 300px;
    margin: 0 auto;
  }

  :global(.attemptCard) {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border-radius: 8px;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid var(--color-border);
  }

  :global(.attemptCard.good) {
    border-color: rgba(34, 197, 94, 0.55);
    background: rgba(34, 197, 94, 0.08);
  }

  :global(.attemptCard.bad) {
    border-color: rgba(239, 68, 68, 0.55);
    background: rgba(239, 68, 68, 0.08);
  }

  :global(.champIcon) {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    flex: none;
  }

  :global(.champName) {
    font-size: 14px;
    line-height: 1.1;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  :global(.subcard) {
    padding: 14px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  :global(input) {
    height: 40px;
    padding: 0 12px;
    border-radius: 10px;
    border: 1px solid var(--color-border-strong);
    background: rgba(0, 0, 0, 0.2);
    color: var(--color-text);
    outline: none;
    min-width: 220px;
  }

  :global(input:focus) {
    border-color: rgba(99, 102, 241, 0.7);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.18);
  }

  :global(button) {
    height: 40px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid var(--color-button-border);
    background: var(--color-button);
    color: var(--color-text);
    cursor: pointer;
    transition:
      transform 80ms ease,
      background 160ms ease,
      border-color 160ms ease;
  }

  :global(button:hover) {
    background: var(--color-button-hover);
    border-color: rgba(255, 255, 255, 0.22);
  }

  :global(button:active) {
    transform: translateY(1px);
  }

  :global(button:disabled) {
    opacity: 0.45;
    cursor: not-allowed;
  }

  :global(ol) {
    margin: 0;
    padding-left: 20px;
  }

  :global(li) {
    padding: 2px 0;
  }

  :global(.bad) {
    color: var(--color-danger);
  }

  :global(.good) {
    color: var(--color-success);
    font-weight: 600;
  }
</style>
