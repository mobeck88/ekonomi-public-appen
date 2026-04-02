<script lang="ts">
  export let open = false;
  export let event = null;
  export let members = [];
  export let onClose = () => {};
  export let onSave = () => {};
  export let onDelete = () => {};

  let title = '';
  let description = '';
  let start = '';
  let end = '';
  let attendees = [];

  $: if (event) {
    title = event.title;
    description = event.description;
    start = event.start.slice(0, 16);
    end = event.end.slice(0, 16);
    attendees = event.attendees ?? [];
  } else {
    title = '';
    description = '';
    start = '';
    end = '';
    attendees = [];
  }
</script>

{#if open}
<div class="overlay" on:click={onClose}>
  <div class="modal" on:click|stopPropagation>
    <h2>{event ? 'Redigera händelse' : 'Ny händelse'}</h2>

    <input bind:value={title} placeholder="Titel" />
    <textarea bind:value={description} placeholder="Beskrivning"></textarea>
    <input type="datetime-local" bind:value={start} />
    <input type="datetime-local" bind:value={end} />

    <label>Deltagare</label>
    <div class="attendees">
      {#each members as m}
        <label class="member">
          <input
            type="checkbox"
            value={m.id}
            checked={attendees.includes(m.id)}
            on:change={() => {
              attendees = attendees.includes(m.id)
                ? attendees.filter(a => a !== m.id)
                : [...attendees, m.id];
            }}
          />
          <span class="dot" style={`background:${m.color}`}></span>
          {m.name}
        </label>
      {/each}
    </div>

    <div class="actions">
      {#if event}
        <button class="delete" on:click={() => onDelete(event.id)}>Radera</button>
      {/if}
      <button on:click={() => onSave({ title, description, start, end, attendees })}>
        Spara
      </button>
      <button on:click={onClose}>Stäng</button>
    </div>
  </div>
</div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .modal {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    width: 350px;
  }
  input, textarea {
    width: 100%;
    margin-bottom: 0.5rem;
    padding: 0.4rem;
  }
  .attendees {
    margin-bottom: 1rem;
  }
  .member {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .actions {
    display: flex;
    justify-content: space-between;
  }
  .delete {
    background: #ff6b6b;
    color: white;
  }
</style>
