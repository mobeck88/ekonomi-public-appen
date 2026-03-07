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

    /* ⭐ FIX: tillåt mobilmenyn att synas */
    overflow-x: hidden;
    overflow-y: auto;
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
    overflow-y: auto;
  }
</style>
