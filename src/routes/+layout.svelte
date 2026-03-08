<script>
  import Nav from '$lib/components/Nav.svelte';
</script>

<div class="app-container">
  <Nav />

  <main class="page-content">
    <slot />
  </main>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column; /* MOBIL: Nav överst */
    width: 100%;
    height: 100vh;

    /* ⭐ RÄTT: ingen scroll här */
    overflow: hidden;
  }

  /* DESKTOP */
  @media (min-width: 768px) {
    .app-container {
      flex-direction: row; /* DESKTOP: Nav till vänster */
    }
  }

  .page-content {
    flex: 1;
    padding: 20px;

    /* ⭐ Scroll här istället */
    overflow-y: auto;
  }
</style>
