<script lang="ts">
  export let events = [];
  export let members = [];
  export let onSelect = () => {};

  function format(d) {
    return new Date(d).toLocaleString('sv-SE', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }
</script>

<div class="calendar">
  {#each events as e}
    <div
      class="event"
      style={`border-left-color:${e.color}`}
      on:click={() => onSelect(e)}
    >
      <strong>{e.title}</strong>
      <div class="time">{format(e.start)}</div>

      <div class="dots">
        {#each e.attendees as a}
          <span
            class="dot"
            style={`background:${members.find(m => m.id === a)?.color ?? '#ccc'}`}
          ></span>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .calendar { display: flex; flex-direction: column; gap: 0.5rem; }
  .event {
    background: #f0f0f0;
    padding: 0.6rem;
    border-radius: 4px;
    border-left: 4px solid;
    cursor: pointer;
  }
  .dots { display: flex; gap: 0.25rem; margin-top: 0.25rem; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
</style>
