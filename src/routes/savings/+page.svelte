<script lang="ts">
    export let data;

    let createAmount = '';
    let createStart = '';
    let createTitle = '';
    let createDescription = '';

    // Accordion states
    let showActive = false;
    let showCreate = false;
    let showHistory = false;
</script>

<h1>Sparande</h1>

<!-- ⭐ Sektion: Aktiva sparanden -->
<div class="section">
    <button class="section-header" on:click={() => showActive = !showActive}>
        <span>Aktiva sparanden</span>
        <span>{showActive ? "▲" : "▼"}</span>
    </button>

    {#if showActive}
        {#if data.active && data.active.length > 0}
            {#each data.active as s}
                <div class="card">
                    <div class="row">
                        <div class="info">
                            <strong>{s.amount} kr</strong><br />
                            <span class="label">Start:</span> {s.start_month}<br />
                            <span class="label">Slut:</span>
                            {#if s.end_month}
                                {s.end_month}
                            {:else}
                                aktiv
                            {/if}
                        </div>

                        <div class="actions">
                            <form method="post" action="?/update">
                                <input type="hidden" name="saving_group_id" value={s.saving_group_id} />

                                <label for={"amount-" + s.id}>Nytt belopp</label>
                                <input id={"amount-" + s.id} name="amount" type="number" required />

                                <label for={"start-" + s.id}>Gäller från (YYYY-MM)</label>
                                <input id={"start-" + s.id} name="start_month" type="month" required />

                                <button>Uppdatera</button>
                            </form>

                            <form method="post" action="?/end">
                                <input type="hidden" name="saving_group_id" value={s.saving_group_id} />

                                <label for={"end-" + s.id}>Avsluta från (YYYY-MM)</label>
                                <input id={"end-" + s.id} name="end_month" type="month" required />

                                <button class="danger">Avsluta</button>
                            </form>
                        </div>
                    </div>
                </div>
            {/each}
        {:else}
            <p class="empty">Inga aktiva sparanden.</p>
        {/if}
    {/if}
</div>

<!-- ⭐ Sektion: Nytt sparande -->
<div class="section">
    <button class="section-header" on:click={() => showCreate = !showCreate}>
        <span>Nytt sparande</span>
        <span>{showCreate ? "▲" : "▼"}</span>
    </button>

    {#if showCreate}
        <form method="post" action="?/create" class="create-form">
            <label for="title">Rubrik</label>
            <input id="title" name="title" type="text" bind:value={createTitle} required />

            <label for="description">Beskrivning</label>
            <textarea id="description" name="description" rows="2" bind:value={createDescription}></textarea>

            <label for="amount">Belopp</label>
            <input id="amount" name="amount" type="number" bind:value={createAmount} required />

            <label for="start_month">Startmånad (YYYY-MM)</label>
            <input id="start_month" name="start_month" type="month" bind:value={createStart} required />

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
            {#each data.history as s}
                <div class="history">
                    <strong>{s.amount} kr</strong><br />
                    {s.start_month} → {s.end_month}
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

    input, textarea {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    input:focus, textarea:focus {
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
