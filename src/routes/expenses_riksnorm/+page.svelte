<script lang="ts">
    export let data;

<<<<<<< HEAD
=======
    // 🔽 LOKAL LISTA FÖR DROPDOWNEN
    const riksnormTitles = [
        "A-kassa",
        "Barnomsorgsavgift",
        "Bredband",
        "Facket",
        "Hyra"
    ];

>>>>>>> restore-20mars
    let createTitle = '';
    let createDescription = '';
    let createAmount = '';
    let createInterval = '1';
    let createStart = '';

    function toMonthInput(dateString: string | null) {
        if (!dateString) return "";
        return dateString.slice(0, 7);
    }

    let showActive = false;
    let showCreate = false;
    let showHistory = false;
</script>

<h1>Fasta utgifter (Riksnorm)</h1>

<!-- Aktiva utgifter -->
<div class="section">
    <button class="section-header" on:click={() => (showActive = !showActive)}>
        <span>Aktiva utgifter</span>
        <span>{showActive ? '▲' : '▼'}</span>
    </button>

    {#if showActive}
        {#if data.active && data.active.length > 0}
            {#each data.active as e}
                <div class="card">
                    <div class="row">
                        <div class="info">
                            <strong>{e.title}</strong><br />
                            {e.amount} kr<br />
                            <span class="label">Intervall:</span> var {e.interval_months} månad(er)<br />
                            <span class="label">Start:</span> {toMonthInput(e.start_month)}<br />
                            <span class="label">Slut:</span>
                            {#if e.end_month}
                                {toMonthInput(e.end_month)}
                            {:else}
                                aktiv
                            {/if}<br />
                            <span class="label">Skapad av:</span> {e.profiles?.full_name}
                        </div>

                        <div class="actions">
                            <form method="post" action="?/update">
                                <input type="hidden" name="expense_group_id" value={e.expense_group_id} />

                                <label for={"amount-" + e.id}>Nytt belopp</label>
                                <input id={"amount-" + e.id} name="amount" type="number" required />

                                <label for={"interval-" + e.id}>Intervall (månader)</label>
                                <select id={"interval-" + e.id} name="interval_months" required>
                                    <option value="1">Varje månad</option>
                                    <option value="2">Varannan månad</option>
                                    <option value="3">Var tredje månad</option>
                                    <option value="6">Var sjätte månad</option>
                                    <option value="12">Årsvis</option>
                                </select>

                                <label for={"start-" + e.id}>Gäller från (YYYY-MM)</label>
                                <input id={"start-" + e.id} name="start_month" type="month" required />

                                <button>Uppdatera</button>
                            </form>

                            <form method="post" action="?/end">
                                <input type="hidden" name="expense_group_id" value={e.expense_group_id} />

                                <label for={"end-" + e.id}>Avsluta från (YYYY-MM)</label>
                                <input id={"end-" + e.id} name="end_month" type="month" required />

                                <button class="danger">Avsluta</button>
                            </form>
                        </div>
                    </div>
                </div>
            {/each}
        {:else}
            <p class="empty">Inga aktiva utgifter.</p>
        {/if}
    {/if}
</div>

<!-- Ny utgift -->
<div class="section">
    <button class="section-header" on:click={() => (showCreate = !showCreate)}>
        <span>Ny utgift</span>
        <span>{showCreate ? '▲' : '▼'}</span>
    </button>

    {#if showCreate}
        <form method="post" action="?/create" class="create-form">
<<<<<<< HEAD
            <label for="title">Rubrik</label>
            <input id="title" name="title" type="text" bind:value={createTitle} required />
=======

            <!-- 🔽 ÄNDRING: RUBRIK ÄR NU DROPDOWN -->
            <label for="title">Rubrik</label>
            <select id="title" name="title" bind:value={createTitle} required>
                <option value="" disabled selected>Välj rubrik…</option>
                {#each riksnormTitles as t}
                    <option value={t}>{t}</option>
                {/each}
            </select>
>>>>>>> restore-20mars

            <label for="description">Beskrivning</label>
            <textarea id="description" name="description" rows="2" bind:value={createDescription}></textarea>

            <label for="amount">Belopp</label>
            <input id="amount" name="amount" type="number" bind:value={createAmount} required />

            <label for="interval_months">Intervall</label>
            <select id="interval_months" name="interval_months" bind:value={createInterval} required>
                <option value="1">Varje månad</option>
                <option value="2">Varannan månad</option>
                <option value="3">Var tredje månad</option>
                <option value="6">Var sjätte månad</option>
                <option value="12">Årsvis</option>
            </select>

            <label for="start_month">Startmånad (YYYY-MM)</label>
            <input id="start_month" name="start_month" type="month" bind:value={createStart} required />

            <button>Skapa</button>
        </form>
    {/if}
</div>

<!-- Historik -->
<div class="section">
    <button class="section-header" on:click={() => (showHistory = !showHistory)}>
        <span>Historik</span>
        <span>{showHistory ? '▲' : '▼'}</span>
    </button>

    {#if showHistory}
        {#if data.history && data.history.length > 0}
            {#each data.history as e}
                <div class="history">
                    <strong>{e.title}</strong><br />
                    {e.amount} kr — var {e.interval_months} månad(er)<br />
                    {toMonthInput(e.start_month)} → {toMonthInput(e.end_month)}<br />
                    <span class="label">Skapad av:</span> {e.profiles?.full_name}
                </div>
            {/each}
        {:else}
            <p class="empty">Ingen historik ännu.</p>
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
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
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

    .actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-width: 200px;
    }

    .create-form {
        display: grid;
        gap: 0.9rem;
        padding: 1rem;
        max-width: 420px;
    }

    input,
    textarea,
    select {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    input:focus,
    textarea:focus,
    select:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px #dbeafe;
        background: #ffffff;
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

    button.danger {
        background: #dc2626;
    }

    button.danger:hover {
        background: #b91c1c;
    }

    .history {
        padding: 0.9rem 1rem;
        border-top: 1px solid #e5e7eb;
        color: #374151;
        font-size: 0.95rem;
    }
</style>
