<script lang="ts">
  export let members = [];
  export let active = [];
  export let onToggle = () => {};
</script>

<div class="filters">
  {#each members as m}
    <label class="filter">
      <input
        type="checkbox"
        checked={active.includes(m.id)}
        on:change={() => onToggle(m.id)}
      />
      <span class="dot" style={`background:${m.color}`}></span>
      {m.name}
    </label>
  {/each}
</div>

<style>
  .filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  .filter {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
</style>
