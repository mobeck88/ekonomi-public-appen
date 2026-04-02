<script lang="ts">
  import CalendarView from '$lib/calendar/CalendarView.svelte';
  export let data;

  let view: 'day' | 'week' | 'month' = data.view ?? 'week';

  function goTo(viewType: 'day' | 'week' | 'month') {
    const params = new URLSearchParams({ view: viewType });
    window.location.search = params.toString();
  }

  function shift(direction: 'prev' | 'next') {
    const params = new URLSearchParams(window.location.search);
    params.set('view', view);

    params.set('shift', direction);
    window.location.search = params.toString();
  }

  let title = '';
  let description = '';
  let start = '';
  let end = '';
  let is_shared = false;
  let attendees = '[]';
  let recurrence_rule = '';
  let recurrence_end = '';
  let reminders_minutes = '[]';

  let update_event_id = '';
  let update_type = 'series';
  let update_date = '';

  let delete_event_id = '';
  let delete_type = 'series';
  let delete_date = '';
</script>

<section class="calendar">
  <h1>Familjekalender</h1>

  <div class="view-switch">
    <button on:click={() => goTo('day')}>Dag</button>
    <button on:click={() => goTo('week')}>Vecka</button>
    <button on:click={() => goTo('month')}>Månad</button>
  </div>

  <div class="nav">
    <button on:click={() => shift('prev')}>◀ Föregående</button>
    <button on:click={() => shift('next')}>Nästa ▶</button>
  </div>

  <CalendarView events={data.events} view={view} />

  <!-- CREATE -->
  <form method="POST" action="?/create">
    <h2>Skapa händelse</h2>

    <input name="title" placeholder="Titel" bind:value={title} />
    <input name="description" placeholder="Beskrivning" bind:value={description} />
    <input name="start" type="datetime-local" bind:value={start} />
    <input name="end" type="datetime-local" bind:value={end} />

    <label>
      <input type="checkbox" bind:checked={is_shared} />
      Delad händelse
    </label>

    <input name="attendees" placeholder='["member-id"]' bind:value={attendees} />
    <input name="recurrence_rule" placeholder="RRULE" bind:value={recurrence_rule} />
    <input name="recurrence_end" type="date" bind:value={recurrence_end} />
    <input name="reminders_minutes" placeholder="[30,10]" bind:value={reminders_minutes} />

    <input type="hidden" name="is_shared" value={is_shared} />

    <button type="submit">Skapa</button>
  </form>

  <!-- UPDATE -->
  <form method="POST" action="?/update">
    <h2>Uppdatera händelse</h2>

    <input name="event_id" placeholder="Event ID" bind:value={update_event_id} />

    <select name="update_type" bind:value={update_type}>
      <option value="series">Hela serien</option>
      <option value="single">Endast denna</option>
    </select>

    <input name="date" type="date" bind:value={update_date} />

    <input name="title" placeholder="Ny titel" />
    <input name="description" placeholder="Ny beskrivning" />
    <input name="start" type="datetime-local" />
    <input name="end" type="datetime-local" />
    <input name="reminders_minutes" placeholder="[30,10]" />

    <button type="submit">Uppdatera</button>
  </form>

  <!-- DELETE -->
  <form method="POST" action="?/delete">
    <h2>Radera händelse</h2>

    <input name="event_id" placeholder="Event ID" bind:value={delete_event_id} />

    <select name="delete_type" bind:value={delete_type}>
      <option value="series">Hela serien</option>
      <option value="single">Endast denna</option>
    </select>

    <input name="date" type="date" bind:value={delete_date} />

    <button type="submit">Radera</button>
  </form>
</section>

<style>
  section {
    padding: 1.5rem;
  }

  .view-switch button,
  .nav button {
    margin-right: 0.5rem;
    padding: 0.4rem 0.8rem;
  }

  form {
    margin-top: 2rem;
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 6px;
  }

  input, select {
    display: block;
    margin-bottom: 0.5rem;
    padding: 0.4rem;
    width: 100%;
  }

  button {
    padding: 0.5rem 1rem;
  }
</style>
