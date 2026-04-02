<script lang="ts">
  export let open = false;
  export let event = null;
  export let members = [];
  export let onClose = () => {};
  export let onSave = (_payload: any) => {};
  export let onDelete = (_id: string) => {};

  let title = '';
  let description = '';
  let start = '';
  let end = '';
  let attendees: string[] = [];
  let is_shared = false;

  $: if (event) {
    title = event.title ?? '';
    description = event.description ?? '';
    start = event.start ? event.start.slice(0, 16) : '';
    end = event.end ? event.end.slice(0, 16) : '';
    attendees = event.attendees ?? [];
    is_shared = event.is_shared ?? false;
  } else {
    title = '';
    description = '';
    start = '';
    end = '';
    attendees = [];
    is_shared = false; // default: min händelse
  }

  function toggleAttendee(id: string) {
    attendees = attendees.includes(id)
      ? attendees.filter((a) => a !== id)
      : [...attendees, id];
  }

  function handleSave() {
    onSave({
      title,
      description,
      start,
      end,
      attendees,
      is_shared
    });
    onClose();
  }
</script>

{#if open}
  <div class="overlay" on:click={onClose}>
    <div class="modal" on:click|stopPropagation>
      <h2>{event ? 'Redigera händelse' : 'Ny händelse'}</h2>

      <div class="field">
        <label>Titel</label>
        <input bind:value={title} />
      </div>

      <div class="field">
        <label>Beskrivning</label>
        <textarea bind:value={description}></textarea>
      </div>

      <div class="row">
        <div class="field">
          <label>Start</label>
          <input type="datetime-local" bind:value={start} />
        </div>
        <div class="field">
          <label>Slut</label>
          <input type="datetime-local" bind:value={end} />
        </div>
      </div>

      <div class="field">
        <label>
          <input type="checkbox" bind:checked={is_shared} />
          Delad händelse (annars bara min)
        </label>
      </div>

      {#if is_shared}
        <div class="field">
          <label>Deltagare</label>
          <div class="attendees">
            {#each members as m}
              <label class="member">
                <input
                  type="checkbox"
                  checked={attendees.includes(m.id)}
                  on:change={() => toggleAttendee(m.id)}
                />
                <span class="dot" style={`background:${m.color}`}></span>
                {m.name}
              </label>
            {/each}
          </div>
        </div>
      {/if}

      <div class="actions">
        {#if event}
          <button class="delete" on:click={() => onDelete(event.id)}>Radera</button>
        {/if}
        <div class="right">
          <button type="button" on:click={handleSave}>Spara</button>
          <button type="button" class="secondary" on:click={onClose}>Avbryt</button>
        </div>
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
    width: 380px;
    max-width: 90vw;
  }
  .field {
    margin-bottom: 0.75rem;
  }
  label {
    font-size: 0.9rem;
    display: block;
    margin-bottom: 0.25rem;
  }
  input, textarea {
    width: 100%;
    padding: 0.4rem;
    box-sizing: border-box;
  }
  textarea {
    min-height: 60px;
  }
  .row {
    display: flex;
    gap: 0.5rem;
  }
  .attendees {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .member {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
  }
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }
  .actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
  }
  .right {
    display: flex;
    gap: 0.5rem;
  }
  .delete {
    background: #ff6b6b;
    color: white;
    border: none;
    padding: 0.4rem 0.8rem;
    cursor: pointer;
  }
  button {
    padding: 0.4rem 0.8rem;
    cursor: pointer;
  }
  .secondary {
    background: #eee;
  }
</style>
