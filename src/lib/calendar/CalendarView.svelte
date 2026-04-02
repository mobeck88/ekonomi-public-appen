<script lang="ts">
  export let events = [];
  export let view = 'week';
  export let onSelect = () => {};

  const today = new Date();

  function format(d) {
    return new Date(d).toLocaleString('sv-SE', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  function getWeekDates(date) {
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }

  const weekDates = getWeekDates(today);

  function isSameDay(a, b) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
</script>

<div class="calendar">
  {#if view === 'week'}
    <div class="week-grid">
      {#each weekDates as d}
        <div class="day-col">
          <div class="day-header">
            {d.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric' })}
          </div>

          {#each events.filter(e => isSameDay(new Date(e.start), d)) as e}
            <div
              class="event"
              style={`border-left-color:${e.color}`}
              on:click={() => onSelect(e)}
            >
              <strong>{e.title}</strong>
              <div class="dots">
                {#each e.attendeeColors as c}
                  <span class="dot" style={`background:${c}`}></span>
                {/each}
              </div>
              <div>{format(e.start)}</div>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.6rem;
  }
  .day-col {
    border: 1px solid #ddd;
    padding: 0.6rem;
    border-radius: 6px;
  }
  .event {
    background: #f0f0f0;
    padding: 0.5rem;
    border-radius: 4px;
    margin-bottom: 0.4rem;
    border-left: 4px solid;
    cursor: pointer;
  }
  .dots {
    display: flex;
    gap: 0.2rem;
    margin: 0.2rem 0;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
</style>
