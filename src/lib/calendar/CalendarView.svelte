<script lang="ts">
  export let events = [];
  export let view: 'day' | 'week' | 'month' = 'week';

  const today = new Date();

  function format(d: string) {
    return new Date(d).toLocaleString('sv-SE', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  function getWeekDates(date: Date) {
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  const weekDates = getWeekDates(today);

  function isSameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
</script>

{#if view === 'day'}
  <h2>Dagvy</h2>
  <div class="day-view">
    {#each events as e}
      <div class="event" style={`border-left-color: ${e.color || '#0078ff'}`}>
        <strong>{e.title}</strong>
        <div>{format(e.start)} – {format(e.end)}</div>
      </div>
    {/each}
  </div>
{/if}

{#if view === 'week'}
  <h2>Veckovy</h2>
  <div class="week-grid">
    {#each weekDates as d}
      <div class="day-col {isSameDay(d, today) ? 'today' : ''}">
        <div class="day-header">
          {d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric' })}
        </div>

        {#each events.filter(e => isSameDay(new Date(e.start), d)) as e}
          <div class="event" style={`border-left-color: ${e.color || '#0078ff'}`}>
            <strong>{e.title}</strong>
            <div>{format(e.start)} – {format(e.end)}</div>
          </div>
        {/each}
      </div>
    {/each}
  </div>
{/if}

{#if view === 'month'}
  <h2>Månadsvy</h2>
  <div class="month-view">
    {#each events as e}
      <div class="event" style={`border-left-color: ${e.color || '#0078ff'}`}>
        <strong>{e.title}</strong>
        <div>{format(e.start)} – {format(e.end)}</div>
      </div>
    {/each}
  </div>
{/if}

<style>
  h2 {
    margin-bottom: 1rem;
  }

  .day-view,
  .month-view {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.6rem;
  }

  .day-col {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 0.6rem;
    background: #fafafa;
    min-height: 120px;
  }

  .day-col.today {
    border-color: #0078ff;
    background: #eaf3ff;
  }

  .day-header {
    font-weight: bold;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .event {
    background: #f0f0f0;
    padding: 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.4rem;
    font-size: 0.85rem;
    border-left: 4px solid transparent;
  }

  .event strong {
    display: block;
    margin-bottom: 0.2rem;
  }
</style>
