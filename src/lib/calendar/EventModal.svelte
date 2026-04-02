<script lang="ts">
  export let open = false;
  export let event = null;
  export let members = [];
  export let canEdit = false;

  export let onClose = () => {};
  export let onSave = (_payload) => {};
  export let onDelete = (_id) => {};

  let title = '';
  let description = '';
  let start = '';
  let end = '';
  let attendees = [];
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
    is_shared = false;
  }

  function toggleAttendee(id) {
    attendees = attendees.includes(id)
      ? attendees.filter(a => a !== id)
      : [...attendees, id];
  }

  function save() {
    onSave({ title, description, start, end, attendees, is_shared });
    onClose();
  }
</script>

{#if open}
  <div class="overlay" on:click={onClose}>
    <div class="modal" on:click|stopPropagation>
      <h2>{event ? 'Redigera händelse' : 'Ny händelse'}</h2>

      <div class="field">
        <label>Titel</label>
        <input bind:value={title} {disabled:!canEdit} />
      </div>

      <div class="field">
        <label>Beskrivning</label>
        <textarea bind:value={description} {disabled:!canEdit}></textarea>
      </div>

      <div class="row">
        <div class="field">
          <label>Start</label>
          <input type="datetime-local" bind:value={start} {disabled:!canEdit} />
        </div>
        <div class="field">
          <label>Slut</label>
          <input type="datetime-local" bind:value={end} {disabled:!canEdit} />
        </div>
      </div>

      <div class="field">
        <label>
          <input type="checkbox" bind:checked={is_shared} {disabled:!canEdit} />
          Delad händelse
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
                  {disabled:!canEdit}
                />
                <span class="dot" style={`background:${m.color}`}></span>
                {m.name}
              </label>
            {/each}
          </div>
        </div>
      {/if}

      <div class="actions">
        {#if event && canEdit}
          <button class="delete" on:click={() => onDelete(event.id)}>Radera</button>
        {/if}

        <div class="right">
          {#if canEdit}
            <button on:click={save}>Spara</button>
          {/if}
          <button class="secondary" on:click={onClose}>Avbryt</button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex; justify-content: center; align-items: center;
  }
  .modal {
    background: white; padding: 1.5rem; border-radius: 8px;
    width: 380px; max-width: 90vw;
  }
  .field { margin-bottom: 0.75rem; }
  .row { display: flex; gap: 0.5rem; }
  .attendees { display: flex; flex-direction: column; gap: 0.25rem; }
  .member { display: flex; align-items: center; gap: 0.4rem; }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .actions { display: flex; justify-content: space-between; margin-top: 1rem; }
  .right { display: flex; gap: 0.5rem; }
  .delete { background: #ff6b6b; color: white; border: none; padding: 0.4rem 0.8rem; }
  button { padding: 0.4rem 0.8rem; }
  .secondary { background: #eee; }
</style>
