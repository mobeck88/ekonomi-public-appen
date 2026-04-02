<script lang="ts">
  import CalendarView from '$lib/calendar/CalendarView.svelte';
  import EventModal from '$lib/calendar/EventModal.svelte';
  import MemberFilter from '$lib/calendar/MemberFilter.svelte';

  export let data;

  let modalOpen = false;
  let selectedEvent = null;

  let filter = data.members.map((m) => m.id);

  function toggleFilter(id: string) {
    filter = filter.includes(id)
      ? filter.filter((f) => f !== id)
      : [...filter, id];
  }

  function openEvent(e) {
    selectedEvent = e;
    modalOpen = true;
  }

  function openNew() {
    selectedEvent = null;
    modalOpen = true;
  }

  async function saveEvent(payload) {
    if (selectedEvent) {
      await fetch('?/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          ...payload
        })
      });
    } else {
      await fetch('?/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

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

<button on:click={openNew}>➕ Ny händelse</button>

<MemberFilter
  members={data.members}
  active={filter}
  onToggle={toggleFilter}
/>

<CalendarView
  events={data.events.filter(
    (e) =>
      e.attendees.length === 0 ||
      e.attendees.some((a) => filter.includes(a))
  )}
  view={data.view}
  onSelect={openEvent}
/>

<EventModal
  open={modalOpen}
  event={selectedEvent}
  members={data.members}
  onClose={closeModal}
  onSave={saveEvent}
  onDelete={deleteEvent}
/>

<style>
  h1 {
    margin-bottom: 1rem;
  }
  button {
    margin-bottom: 1rem;
    padding: 0.5rem 1rem;
  }
</style>
