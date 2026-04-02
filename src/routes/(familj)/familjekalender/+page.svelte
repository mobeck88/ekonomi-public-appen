<script lang="ts">
    export let data;

    const events = data.events ?? [];
    const access = data.access;

    let currentDate = new Date();
    let selectedDate: Date | null = null;
    let editingEvent: any = null;
    let mode: 'create' | 'edit' = 'create';

    const today = new Date();

    function toLocalDate(d: Date) {
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    }

    function sameDay(a: Date, b: Date) {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    }

    function getMonthLabel(d: Date) {
        return d.toLocaleDateString('sv-SE', { month: 'long', year: 'numeric' });
    }

    function daysInMonth(year: number, month: number) {
        return new Date(year, month + 1, 0).getDate();
    }

    function getCalendarDays(d: Date) {
        const year = d.getFullYear();
        const month = d.getMonth();
        const firstDay = new Date(year, month, 1);
        const firstWeekday = (firstDay.getDay() + 6) % 7;

        const totalDays = daysInMonth(year, month);
        const days: { date: Date }[] = [];

        for (let i = 0; i < firstWeekday; i++) {
            days.push({ date: new Date(year, month, 1 - (firstWeekday - i)) });
        }

        for (let day = 1; day <= totalDays; day++) {
            days.push({ date: new Date(year, month, day) });
        }

        while (days.length % 7 !== 0) {
            const last = days[days.length - 1].date;
            days.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1) });
        }

        return days;
    }

    $: calendarDays = getCalendarDays(currentDate);

    function prevMonth() {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() - 1);
        currentDate = d;
    }

    function nextMonth() {
        const d = new Date(currentDate);
        d.setMonth(d.getMonth() + 1);
        currentDate = d;
    }

    function selectDay(d: Date) {
        selectedDate = d;
        editingEvent = null;
        mode = 'create';
    }

    function normalizeDate(d: Date) {
        return toLocalDate(d);
    }

    function diffInDays(a: Date, b: Date) {
        const ms = normalizeDate(b).getTime() - normalizeDate(a).getTime();
        return Math.floor(ms / (1000 * 60 * 60 * 24));
    }

    function parseRRule(rule: string | null) {
        if (!rule) return null;
        const parts = rule.split(';');
        const out: Record<string, string> = {};
        for (const p of parts) {
            const [k, v] = p.split('=');
            if (k && v) out[k.toUpperCase()] = v;
        }
        return out;
    }

    function isRecurringInstance(e: any, day: Date) {
        if (!e.is_recurring || !e.recurrence_rule) return false;

        const rule = parseRRule(e.recurrence_rule);
        if (!rule || !rule['FREQ']) return false;

        const freq = rule['FREQ'];
        const interval = rule['INTERVAL'] ? parseInt(rule['INTERVAL'], 10) : 1;

        const startRaw = new Date(e.start);
        const start = toLocalDate(startRaw);

        const until = e.recurrence_end
            ? toLocalDate(new Date(e.recurrence_end))
            : new Date(start.getFullYear() + 5, start.getMonth(), start.getDate());

        const d = toLocalDate(day);

        if (d < start || d > until) return false;

        if (freq === 'DAILY') {
            const diff = diffInDays(start, d);
            return diff >= 0 && diff % interval === 0;
        }

        if (freq === 'WEEKLY') {
            const diff = diffInDays(start, d);
            if (diff < 0) return false;
            const weeks = Math.floor(diff / 7);
            return weeks % interval === 0;
        }

        if (freq === 'MONTHLY') {
            if (d.getDate() !== start.getDate()) return false;
            const monthsDiff =
                (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
            return monthsDiff >= 0 && monthsDiff % interval === 0;
        }

        if (freq === 'YEARLY') {
            return (
                d.getDate() === start.getDate() &&
                d.getMonth() === start.getMonth() &&
                (d.getFullYear() - start.getFullYear()) % interval === 0
            );
        }

        return false;
    }

    function eventsForDay(d: Date) {
        const day = toLocalDate(d);

        return events.filter((e: any) => {
            const startRaw = new Date(e.start);
            const endRaw = e.end ? new Date(e.end) : new Date(e.start);

            const start = toLocalDate(startRaw);
            const end = toLocalDate(endRaw);

            if (end < start) end.setTime(start.getTime());

            if (!e.is_recurring) {
                return day >= start && day <= end;
            }

            if (!isRecurringInstance(e, day)) return false;

            const durationDays = Math.max(0, diffInDays(start, end));
            const diff = diffInDays(start, day);

            return diff >= 0 && diff <= durationDays;
        });
    }

    function openEditEvent(e: any) {
        editingEvent = e;
        selectedDate = new Date(e.start);
        mode = 'edit';
    }

    function formatDateInput(d: Date | null) {
        if (!d) return '';
        const iso = d.toISOString();
        return iso.slice(0, 16);
    }

    function recurrencePatternFromRule(e: any): string {
        if (!e.is_recurring || !e.recurrence_rule) return 'none';
        const rule = parseRRule(e.recurrence_rule);
        if (!rule || !rule['FREQ']) return 'none';

        const freq = rule['FREQ'];
        const interval = rule['INTERVAL'] ? parseInt(rule['INTERVAL'], 10) : 1;

        if (freq === 'DAILY') {
            if (interval === 1) return 'daily_1';
            if (interval === 2) return 'daily_2';
        }
        if (freq === 'WEEKLY') {
            if (interval === 1) return 'weekly_1';
            if (interval === 2) return 'weekly_2';
            if (interval === 3) return 'weekly_3';
            if (interval === 4) return 'weekly_4';
        }
        if (freq === 'MONTHLY') {
            if (interval === 1) return 'monthly_1';
            if (interval === 2) return 'monthly_2';
            if (interval === 3) return 'monthly_3';
            if (interval === 6) return 'halfyear_1';
        }
        if (freq === 'YEARLY') {
            if (interval === 1) return 'yearly_1';
        }
        return 'none';
    }
</script>

<section class="calendar-page">
    <header class="calendar-header">
        <div class="month-nav">
            <button type="button" on:click={prevMonth}>&laquo;</button>
            <h1>{getMonthLabel(currentDate)}</h1>
            <button type="button" on:click={nextMonth}>&raquo;</button>
        </div>
        <p class="subtitle">Familjekalender – egna, gemensamma och återkommande händelser</p>
    </header>

    <div class="calendar-layout">
        <div class="month-view">
            <div class="weekday-row">
                <div>Mån</div>
                <div>Tis</div>
                <div>Ons</div>
                <div>Tor</div>
                <div>Fre</div>
                <div>Lör</div>
                <div>Sön</div>
            </div>

            <div class="days-grid">
                {#each calendarDays as day (day.date.toISOString())}
                    <button
                        type="button"
                        class:selected={selectedDate && sameDay(selectedDate, day.date)}
                        class:today={sameDay(day.date, today)}
                        class:other-month={day.date.getMonth() !== currentDate.getMonth()}
                        on:click={() => selectDay(day.date)}
                    >
                        <span class="day-number">{day.date.getDate()}</span>
                        <div class="day-events">
                            {#each eventsForDay(day.date) as ev}
                                <div
                                    class="day-event-dot"
                                    style={`background:${ev.color}`}
                                    title={ev.title}
                                />
                            {/each}
                        </div>
                    </button>
                {/each}
            </div>
        </div>

        <div class="day-detail">
            {#if selectedDate}
                <h2>
                    {selectedDate.toLocaleDateString('sv-SE', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    })}
                </h2>

                <div class="day-events-list">
                    {#if eventsForDay(selectedDate).length === 0}
                        <p>Inga händelser denna dag.</p>
                    {:else}
                        {#each eventsForDay(selectedDate) as ev}
                            <article
                                class="event-card"
                                style={`border-left-color:${ev.color}`}
                                on:click={() => openEditEvent(ev)}
                            >
                                <h3>{ev.title}</h3>
                                <p class="time">
                                    {new Date(ev.start).toLocaleTimeString('sv-SE', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                    {#if ev.end}
                                        –
                                        {new Date(ev.end).toLocaleTimeString('sv-SE', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    {/if}
                                </p>
                                {#if ev.description}
                                    <p class="description">{ev.description}</p>
                                {/if}
                                <div class="badges">
                                    {#if ev.is_shared}
                                        <span class="badge">Familjehändelse</span>
                                    {:else}
                                        <span class="badge secondary">Min händelse</span>
                                    {/if}
                                    {#if ev.is_recurring}
                                        <span class="badge recurring">Återkommande</span>
                                    {/if}
                                </div>
                            </article>
                        {/each}
                    {/if}
                </div>

                {#if access.canEdit}
                    <div class="editor">
                        <h3>{mode === 'create' ? 'Ny händelse' : 'Redigera händelse'}</h3>

                        {#if mode === 'create'}
                            <form method="POST" action="?/create">
                                <label>
                                    Titel
                                    <input name="title" required />
                                </label>

                                <label>
                                    Beskrivning
                                    <textarea name="description" rows="3" />
                                </label>

                                <label>
                                    Start
                                    <input
                                        type="datetime-local"
                                        name="start"
                                        required
                                        value={formatDateInput(selectedDate)}
                                    />
                                </label>

                                <label>
                                    Slut
                                    <input type="datetime-local" name="end" />
                                </label>

                                <label class="checkbox-row">
                                    <input type="checkbox" name="is_shared" />
                                    <span>Familjehändelse (hela hushållet)</span>
                                </label>

                                <label>
                                    Återkommande
                                    <select name="recurrence_pattern">
                                        <option value="none">Ingen</option>
                                        <option value="daily_1">Varje dag</option>
                                        <option value="daily_2">Varannan dag</option>
                                        <option value="weekly_1">Varje vecka</option>
                                        <option value="weekly_2">Varannan vecka</option>
                                        <option value="weekly_3">Var tredje vecka</option>
                                        <option value="weekly_4">Var fjärde vecka</option>
                                        <option value="monthly_1">Varje månad (datum)</option>
                                        <option value="monthly_2">Varannan månad</option>
                                        <option value="monthly_3">Var tredje månad</option>
                                        <option value="halfyear_1">Varje halvår</option>
                                        <option value="yearly_1">Varje år</option>
                                    </select>
                                </label>

                                <label>
                                    Återkommande till och med (valfritt)
                                    <input type="date" name="recurrence_end" />
                                </label>

                                <div class="buttons">
                                    <button type="submit" class="primary">Spara händelse</button>
                                </div>
                            </form>
                        {:else if editingEvent}
                            <form method="POST" action="?/update">
                                <input type="hidden" name="event_id" value={editingEvent.id} />

                                <label>
                                    Titel
                                    <input name="title" required value={editingEvent.title} />
                                </label>

                                <label>
                                    Beskrivning
                                    <textarea name="description" rows="3">
{editingEvent.description}</textarea
                                    >
                                </label>

                                <label>
                                    Start
                                    <input
                                        type="datetime-local"
                                        name="start"
                                        required
                                        value={formatDateInput(new Date(editingEvent.start))}
                                    />
                                </label>

                                <label>
                                    Slut
                                    <input
                                        type="datetime-local"
                                        name="end"
                                        value={editingEvent.end
                                            ? formatDateInput(new Date(editingEvent.end))
                                            : ''}
                                    />
                                </label>

                                <label class="checkbox-row">
                                    <input
                                        type="checkbox"
                                        name="is_shared"
                                        checked={editingEvent.is_shared}
                                    />
                                    <span>Familjehändelse (hela hushållet)</span>
                                </label>

                                <label>
                                    Återkommande
                                    <select
                                        name="recurrence_pattern"
                                        value={recurrencePatternFromRule(editingEvent)}
                                    >
                                        <option value="none">Ingen</option>
                                        <option value="daily_1">Varje dag</option>
                                        <option value="daily_2">Varannan dag</option>
                                        <option value="weekly_1">Varje vecka</option>
                                        <option value="weekly_2">Varannan vecka</option>
                                        <option value="weekly_3">Var tredje vecka</option>
                                        <option value="weekly_4">Var fjärde vecka</option>
                                        <option value="monthly_1">Varje månad (datum)</option>
                                        <option value="monthly_2">Varannan månad</option>
                                        <option value="monthly_3">Var tredje månad</option>
                                        <option value="halfyear_1">Varje halvår</option>
                                        <option value="yearly_1">Varje år</option>
                                    </select>
                                </label>

                                <label>
                                    Återkommande till och med (valfritt)
                                    <input
                                        type="date"
                                        name="recurrence_end"
                                        value={editingEvent.recurrence_end
                                            ? new Date(editingEvent.recurrence_end)
                                                    .toISOString()
                                                    .slice(0, 10)
                                            : ''}
                                    />
                                </label>

                                <div class="buttons">
                                    <button type="submit" class="primary">Spara ändringar</button>
                                </div>
                            </form>

                            <form method="POST" action="?/delete">
                                <input type="hidden" name="event_id" value={editingEvent.id} />
                                <button type="submit" class="danger">Ta bort händelse</button>
                            </form>
                        {/if}

                        {#if mode === 'edit'}
                            <button
                                type="button"
                                class="link-button"
                                on:click={() => {
                                    mode = 'create';
                                    editingEvent = null;
                                }}
                            >
                                + Skapa ny händelse istället
                            </button>
                        {/if}
                    </div>
                {:else}
                    <p>Du har inte behörighet att redigera denna kalender.</p>
                {/if}
            {:else}
                <div class="no-day-selected">
                    <p>Välj en dag i kalendern för att se och redigera händelser.</p>
                </div>
            {/if}
        </div>
    </div>
</section>

<style>
    .calendar-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .calendar-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .month-nav {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .month-nav h1 {
        flex: 1;
        font-size: 1.4rem;
        font-weight: 600;
    }

    .month-nav button {
        border: none;
        background: #e5e7eb;
        border-radius: 999px;
        width: 32px;
        height: 32px;
        cursor: pointer;
    }

    .subtitle {
        color: #6b7280;
        font-size: 0.9rem;
    }

    .calendar-layout {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
        gap: 24px;
    }

    @media (max-width: 900px) {
        .calendar-layout {
            grid-template-columns: 1fr;
        }
    }

    .month-view {
        background: #ffffff;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    }

    .weekday-row {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        margin-bottom: 8px;
        font-size: 0.8rem;
        color: #6b7280;
        text-align: center;
    }

    .days-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
    }

    .days-grid button {
        border: none;
        background: #f9fafb;
        border-radius: 8px;
        padding: 6px;
        min-height: 64px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        justify-content: space-between;
        cursor: pointer;
        transition: background 0.15s, transform 0.05s;
    }

    .days-grid button:hover {
        background: #e5e7eb;
    }

    .days-grid button.selected {
        background: #dbeafe;
        outline: 2px solid #3b82f6;
    }

    .days-grid button.today {
        border: 1px solid #3b82f6;
    }

    .days-grid button.other-month {
        opacity: 0.4;
    }

    .day-number {
        font-size: 0.9rem;
        font-weight: 500;
    }

    .day-events {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
        margin-top: 4px;
    }

    .day-event-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
    }

    .day-detail {
        background: #ffffff;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .day-events-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 220px;
        overflow-y: auto;
    }

    .event-card {
        border-radius: 8px;
        border-left: 4px solid #3b82f6;
        background: #f9fafb;
        padding: 8px 10px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .event-card h3 {
        font-size: 0.95rem;
        margin: 0;
    }

    .event-card .time {
        font-size: 0.8rem;
        color: #4b5563;
    }

    .event-card .description {
        font-size: 0.8rem;
        color: #374151;
    }

    .badges {
        display: flex;
        gap: 4px;
        margin-top: 4px;
    }

    .badge {
        align-self: flex-start;
        font-size: 0.7rem;
        padding: 2px 6px;
        border-radius: 999px;
        background: #3b82f6;
        color: white;
    }

    .badge.secondary {
        background: #6b7280;
    }

    .badge.recurring {
        background: #10b981;
    }

    .editor {
        border-top: 1px solid #e5e7eb;
        padding-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .editor form {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.85rem;
    }

    input[type='text'],
    input[type='datetime-local'],
    input[type='date'],
    textarea,
    select {
        border-radius: 6px;
        border: 1px solid #d1d5db;
        padding: 6px 8px;
        font-size: 0.9rem;
    }

    textarea {
        resize: vertical;
    }

    .checkbox-row {
        flex-direction: row;
        align-items: center;
        gap: 8px;
    }

    .buttons {
        display: flex;
        gap: 8px;
        margin-top: 4px;
    }

    .primary {
        background: #3b82f6;
        color: white;
        border-radius: 6px;
        border: none;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .danger {
        background: #ef4444;
        color: white;
        border-radius: 6px;
        border: none;
        padding: 6px 10px;
        cursor: pointer;
        font-size: 0.85rem;
        margin-top: 4px;
    }

    .link-button {
        background: none;
        border: none;
        color: #3b82f6;
        font-size: 0.85rem;
        cursor: pointer;
        align-self: flex-start;
        padding: 0;
    }

    .no-day-selected {
        color: #6b7280;
        font-size: 0.9rem;
    }
</style>
