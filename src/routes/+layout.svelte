<script>
  import Nav from '$lib/components/Nav.svelte';
  export let data;

  // user och householdId kommer från +layout.server.ts
  const user = data.user;
  const householdId = data.householdId;
</script>

<div class="app-container">
  {#if user}
    <Nav user={user} householdId={householdId} />
  {/if}

  <main class="page-content">
    <slot />
  </main>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  @media (min-width: 768px) {
    .app-container {
      flex-direction: row;
    }
  }

  .page-content {
    flex: 1;
    padding: 24px 20px;
    overflow-y: auto;
    background: #f9fafb;
  }
</style>
