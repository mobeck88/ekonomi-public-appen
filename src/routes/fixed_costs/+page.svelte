<script lang="ts">
    export let data;

    let createName = '';
    let createAmount = '';
    let createStart = '';

    // Accordion states
    let showActive = false;
    let showCreate = false;
    let showHistory = false;
</script>

<h1>Fasta kostnader</h1>

<!-- ⭐ Sektion: Aktiva kostnader -->
<div class="section">
    <button class="section-header" on:click={() => showActive = !showActive}>
        <span>Aktiva kostnader</span>
        <span>{showActive ? "▲" : "▼"}</span>
    </button>

    {#if showActive}
        {#if data.active && data.active.length > 0}
            {#each data.active as c}
                <div class="card">
                    <div class="row">
                        <div class="info">
                            <strong>{c.cost_name}</strong><br />
                            {c.amount} kr/mån<br />
                            <span class="label">Start:</span> {c.start_month}<br />
                            <span class="label">Slut:</span>
                            {#if c.end_month}
                                {c.end_month}
                            {:else}
                                aktiv
                            {/if}
                        </div>

                        <div class="actions">

                            <!-- UPPDATERA -->
                            <form method="post" action="?/update">
                                <input type="hidden" name="cost_group_id" value={c.cost_group_id} />

                                <label for={"update-amount-" + c.cost_group_id}>Nytt belopp</label>
                                <input
                                    id={"update-amount-" + c.cost_group_id}
                                    name="amount"
                                    type="number"
                                    required
                                />

                                <label for={"update-start-" + c.cost_group_id}>Gäller från (YYYY-MM)</label>
                                <input
                                    id={"update-start-" + c.cost_group_id}
                                    name="start_month"
                                    type="month"
                                    required
                                />

                                <button>Uppdatera</button>
                            </form>

                            <!-- AVSLUTA -->
                            <form method="post" action="?/end">
                                <input type="hidden" name="cost_group_id" value={c.cost_group_id} />

                                <label for={"end-month-" + c.cost_group_id}>Avsluta från (YYYY-MM)</label>
                                <input
                                    id={"end-month-" + c.cost_group_id}
                                    name="end_month"
                                    type="month"
                                    required
                                />

                                <button class="danger">Avsluta</button>
                            </form>

                        </div>
                    </div>
                </div>
            {/each}
        {:else}
            <p class="empty">Inga aktiva kostnader.</p>
        {/if}
    {/if}
</div>

<!-- ⭐ Sektion: Ny kostnad -->
<div class="section">
    <button class="section-header" on:click={() => showCreate = !showCreate}>
        <span>Ny kostnad</span>
        <span>{showCreate ? "▲" : "▼"}</span>
    </button>

    {#if showCreate}
        <form method="post" action="?/create" class="create-form">

            <label for="create-name">Kostnadens namn</label>
            <input
                id="create-name"
                name="cost_name"
                type="text"
                bind:value={createName}
                required
            />

            <label for="create-amount">Belopp per månad</label>
            <input
                id="create-amount"
                name="amount"
                type="number"
                bind:value={createAmount}
                required
            />

            <label for="create-start">Startmånad (YYYY-MM)</label>
            <input
                id="create-start"
                name="start_month"
                type="month"
                bind:value={createStart}
                required
            />

            <button>Skapa</button>
        </form>
    {/if}
</div>

<!-- ⭐ Sektion: Historik -->
<div class="section">
    <button class="section-header" on:click={() => showHistory = !showHistory}>
        <span>Historik</span>
        <span>{showHistory ? "▲" : "▼"}</span>
    </button>

    {#if showHistory}
        {#if data.history && data.history.length > 0}
            {#each data.history as c}
                <div class="history">
                    <strong>{c.cost_name}</strong><br />
                    {c.amount} kr/mån<br />
                    {c.start_month} → {c.end_month}
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

    /* Sektioner */
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

    /* Cards */
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

    /* Formulär */
    .create-form {
        display: grid;
        gap: 0.9rem;
        padding: 1rem;
        max-width: 420px;
    }

    input, textarea, select {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    input:focus, textarea:focus, select:focus {
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
