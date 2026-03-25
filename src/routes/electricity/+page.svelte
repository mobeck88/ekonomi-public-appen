<script lang="ts">
    export let data;

    // Form state
    let month = '';
    let eonAmount = '';
    let tibberAmount = '';

    // Selected row for editing
    let selected: any = null;

    // Accordion states
    let showForm = false;
    let showList = false;

    // Convert YYYY-MM-01 → YYYY-MM
    function toMonthInput(dateString: string | null) {
        if (!dateString) return "";
        return dateString.slice(0, 7);
    }

    // Load row into form for editing
    function editRow(row) {
        selected = row;
        month = toMonthInput(row.month);
        eonAmount = row.eon_amount;
        tibberAmount = row.tibber_amount;
        showForm = true;
    }

    // Reset form for new entry
    function newEntry() {
        selected = null;
        month = '';
        eonAmount = '';
        tibberAmount = '';
        showForm = true;
    }

    // Live total
    $: total = (Number(eonAmount) || 0) + (Number(tibberAmount) || 0);
</script>

<h1>Elkostnader</h1>

<!-- ⭐ Sektion: Lägg till / ändra månad -->
<div class="section">
    <button class="section-header" on:click={() => showForm = !showForm}>
        <span>{selected ? "Redigera månad" : "Lägg till månad"}</span>
        <span>{showForm ? "▲" : "▼"}</span>
    </button>

    {#if showForm}
        <form method="post" action="?/save" class="create-form">

            {#if selected}
                <input type="hidden" name="id" value={selected.id} />
            {/if}

            <label for="month">Månad</label>
            <input id="month" name="month" type="month" bind:value={month} required />

            <label for="eon_amount">Nätägare</label>
            <input id="eon_amount" name="eon_amount" type="number" bind:value={eonAmount} required />

            <label for="tibber_amount">Elbolag</label>
            <input id="tibber_amount" name="tibber_amount" type="number" bind:value={tibberAmount} required />

            <label>Totalt</label>
            <div class="summary-box">{total} kr</div>

            <button>Spara</button>
        </form>
    {/if}
</div>

<!-- ⭐ Sektion: Alla månader -->
<div class="section">
    <button class="section-header" on:click={() => showList = !showList}>
        <span>Alla månader</span>
        <span>{showList ? "▲" : "▼"}</span>
    </button>

    {#if showList}
        {#if data.entries.length > 0}
            {#each data.entries as row}
                <div class="card" on:click={() => editRow(row)} style="cursor:pointer;">
                    <div class="row">
                        <div class="info">
                            <strong>{toMonthInput(row.month)}</strong><br />
                            <span class="label">Nätägare:</span> {row.eon_amount} kr<br />
                            <span class="label">Elbolag:</span> {row.tibber_amount} kr<br />
                            <span class="label">Totalt:</span> {row.eon_amount + row.tibber_amount} kr<br />
                            <span class="label">Skapad av:</span> {row.profiles.full_name}
                        </div>
                    </div>
                </div>
            {/each}
        {:else}
            <p class="empty">Inga registrerade månader ännu.</p>
        {/if}
    {/if}
</div>

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    .section {
        margin-bottom: 1.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .section-header {
        width: 100%;
        background: #f3f4f6;
        border: none;
        padding: 1rem 1.2rem;
        font-size: 1.05rem;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        cursor: pointer;
        color: #111827;
    }

    .section-header:hover {
        background: #e5e7eb;
    }

    .empty {
        padding: 1rem;
        color: #6b7280;
    }

    .card {
        border-top: 1px solid #e5e7eb;
        padding: 1rem;
        background: #ffffff;
    }

    .row {
        display: flex;
        justify-content: space-between;
        gap: 1.2rem;
        flex-wrap: wrap;
    }

    .info {
        font-size: 0.95rem;
        color: #374151;
    }

    .label {
        color: #6b7280;
        font-size: 0.85rem;
    }

    .create-form {
        display: grid;
        gap: 0.9rem;
        padding: 1rem;
        max-width: 420px;
    }

    input {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px #dbeafe;
        background: #ffffff;
    }

    .summary-box {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f3f4f6;
        font-weight: 600;
        color: #111827;
    }

    button {
        padding: 0.75rem 1rem;
        border: none;
        background: #2563eb;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        transition: background 0.15s;
    }

    button:hover {
        background: #1d4ed8;
    }
</style>
