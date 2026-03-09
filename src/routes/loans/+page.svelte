<script lang="ts">
    export let data;

    let createName = '';
    let createReference = '';
    let createAmount = '';
    let createStart = '';
    let createOwner = 'shared';

    // Accordion states
    let showActive = false;
    let showCreate = false;
    let showHistory = false;

    function ownerLabel(owner: string) {
        if (owner === "shared") return "Gemensamt";

        const match = data.members.find(m => m.user_id === owner);
        return match?.profiles?.full_name ?? owner;
    }

    function toMonth(dateString: string | null) {
        if (!dateString) return "";
        return dateString.slice(0, 7);
    }
</script>

<h1>Lån</h1>

<!-- ⭐ Sektion: Aktiva lån -->
<div class="section">
    <button class="section-header" on:click={() => showActive = !showActive}>
        <span>Aktiva lån</span>
        <span>{showActive ? "▲" : "▼"}</span>
    </button>

    {#if showActive}
        {#if data.active && data.active.length > 0}
            {#each data.active as l}
                <div class="card">
                    <div class="row">
                        <div class="info">
                            <strong>{l.loan_name}</strong><br />
                            <span class="label">Ref:</span> {l.reference}<br />
                            {l.amount} kr/mån<br />
                            <span class="label">Ägare:</span> {ownerLabel(l.owner)}<br />
                            <span class="label">Start:</span> {toMonth(l.start_month)}<br />
                            <span class="label">Slut:</span>
                            {#if l.end_month}
                                {toMonth(l.end_month)}
                            {:else}
                                aktiv
                            {/if}
                        </div>

                        <div class="actions">

                            <!-- UPPDATERA -->
                            <form method="post" action="?/update">
                                <input type="hidden" name="loan_group_id" value={l.loan_group_id} />

                                <label>Nytt belopp</label>
                                <input name="amount" type="number" required />

                                <label>Ny ägare</label>
                                <select name="owner" required>
                                    <option value="shared">Gemensamt</option>
                                    {#each data.members as m}
                                        <option value={m.user_id}>{m.profiles.full_name}</option>
                                    {/each}
                                </select>

                                <label>Gäller från (YYYY-MM)</label>
                                <input name="start_month" type="month" required />

                                <button>Uppdatera</button>
                            </form>

                            <!-- AVSLUTA -->
                            <form method="post" action="?/end">
                                <input type="hidden" name="loan_group_id" value={l.loan_group_id} />

                                <label>Avsluta från (YYYY-MM)</label>
                                <input name="end_month" type="month" required />

                                <button class="danger">Avsluta</button>
                            </form>

                        </div>
                    </div>
                </div>
            {/each}
        {:else}
            <p class="empty">Inga aktiva lån.</p>
        {/if}
    {/if}
</div>

<!-- ⭐ Sektion: Nytt lån -->
<div class="section">
    <button class="section-header" on:click={() => showCreate = !showCreate}>
        <span>Nytt lån</span>
        <span>{showCreate ? "▲" : "▼"}</span>
    </button>

    {#if showCreate}
        <form method="post" action="?/create" class="create-form">

            <label>Lånets namn</label>
            <input name="loan_name" type="text" bind:value={createName} required />

            <label>Referensnummer</label>
            <input name="reference" type="text" bind:value={createReference} />

            <label>Belopp per månad</label>
            <input name="amount" type="number" bind:value={createAmount} required />

            <label>Ägare</label>
            <select name="owner" bind:value={createOwner} required>
                <option value="shared">Gemensamt</option>
                {#each data.members as m}
                    <option value={m.user_id}>{m.profiles.full_name}</option>
                {/each}
            </select>

            <label>Startmånad (YYYY-MM)</label>
            <input name="start_month" type="month" bind:value={createStart} required />

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
            {#each data.history as l}
                <div class="history">
                    <strong>{l.loan_name}</strong><br />
                    {l.amount} kr/mån<br />
                    <span class="label">Ägare:</span> {ownerLabel(l.owner)}<br />
                    {toMonth(l.start_month)} → {toMonth(l.end_month)}
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
