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
    flex-direction: column;
    width: 100%;
    min-height: 100vh;   /* Viktigt: inte height:100vh */
  }

  @media (min-width: 768px) {
    .app-container {
      flex-direction: row;
    }
  }

  .page-content {
    flex: 1;
    padding: 20px;
    overflow-y: auto;     /* Scroll här */
  }
</style>
