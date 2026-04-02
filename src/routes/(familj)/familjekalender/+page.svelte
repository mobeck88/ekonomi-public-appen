<script lang="ts">
  import EventModal from '$lib/calendar/EventModal.svelte';
  import MemberFilter from '$lib/calendar/MemberFilter.svelte';

  export let data;

  let modalOpen = false;
  let selectedEvent = null;

  const members = data.members;
  const events = data.events;
  const access = data.access;

  // Filter
  let activeFilter = members.map(m => m.id);

  function toggleFilter(id: string) {
    activeFilter = activeFilter.includes(id)
      ? activeFilter.filter(f => f !== id)
      : [...activeFilter, id];
  }

  $: filteredEvents = events.filter(e =>
    e.attendees.length === 0 ||
    e.attendees.some(a => activeFilter.includes(a))
  );

  function openNew() {
    selectedEvent = null;
    modalOpen = true;
  }

  function openEvent(e) {
    selectedEvent = e;
    modalOpen = true;
  }

  async function saveEvent(payload) {
    const endpoint = selectedEvent ? 'update' : 'create';

    await fetch(`?/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        selectedEvent
          ? { event_id: selectedEvent.id, ...payload }
          : payload
      )
    });

    window.location.reload();
  }

  async function deleteEvent(id: string) {
    await fetch('?/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: id })
    });

    window.location.reload();
  }

  function closeModal() {
    modalOpen = false;
    selectedEvent = null;
  }
</script>

<h1>Familjekalender</h1>

{#if access.canEdit}
  <button on:click={openNew}>➕ Ny händelse</button>
{/if}

<MemberFilter
  members={members}
  active={activeFilter}
  onToggle={toggleFilter}
/>

<div class="calendar-wrapper">
  {#each filteredEvents as e}
    <div
      class="event"
      style={`border-left-color:${e.color}`}
      on:click={() => openEvent(e)}
    >
      <strong>{e.title}</strong>
      <div class="time">
        {new Date(e.start).toLocaleString('sv-SE')}
      </div>
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

<EventModal
  open={modalOpen}
  event={selectedEvent}
  members={members}
  canEdit={access.canEdit}
  onClose={closeModal}
  onSave={saveEvent}
  onDelete={deleteEvent}
/>

<style>
  h1 { margin-bottom: 1rem; }
  button { margin-bottom: 1rem; padding: 0.5rem 1rem; }
  .calendar-wrapper { display: flex; flex-direction: column; gap: 0.5rem; }
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
