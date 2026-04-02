<script lang="ts">
  import CalendarView from '$lib/calendar/CalendarView.svelte';
  import EventModal from '$lib/calendar/EventModal.svelte';
  import MemberFilter from '$lib/calendar/MemberFilter.svelte';

  export let data;

  let modalOpen = false;
  let selectedEvent = null;

  let filter = data.members.map(m => m.id);

  function toggleFilter(id) {
    filter = filter.includes(id)
      ? filter.filter(f => f !== id)
      : [...filter, id];
  }

  function openEvent(e) {
    selectedEvent = e;
    modalOpen = true;
  }

  function closeModal() {
    modalOpen = false;
    selectedEvent = null;
  }
</script>

<h1>Familjekalender</h1>

<MemberFilter
  members={data.members}
  active={filter}
  onToggle={toggleFilter}
/>

<CalendarView
  events={data.events.filter(e =>
    e.attendees.length === 0 ||
    e.attendees.some(a => filter.includes(a))
  )}
  view={data.view}
  onSelect={openEvent}
/>

<EventModal
  open={modalOpen}
  event={selectedEvent}
  members={data.members}
  onClose={closeModal}
  onSave={() => {}}
  onDelete={() => {}}
/>

<style>
  h1 {
    margin-bottom: 1rem;
  }
</style>
