<script lang="ts">
    export let data;

    let createAmount = '';
    let createStart = '';
    let createTitle = '';
    let createDescription = '';

    let showActive = false;
    let showCreate = false;
    let showHistory = false;

    function toMonthInput(dateString: string | null) {
        if (!dateString) return "";
        return dateString.slice(0, 7);
    }
</script>

<h1>Fickpengar</h1>

<!-- Dropdown för owner/guardian -->
{#if data.access && data.access.selectableMembers.length > 1}
    <form method="get" class="selector">
        <label for="user">Visa för</label>
        <select id="user" name="user_id" on:change={() => event.target.form.submit()}>
            {#each data.access.selectableMembers as m}
                <option value={m} selected={m === data.access.selectedUserId}>
                    {m}
                </option>
            {/each}
        </select>
    </form>
{/if}

<!-- Aktiva perioder -->
<div class="section">
    <button class="section-header" on:click={() => showActive = !showActive}>
        <span>Aktiva perioder</span>
        <span>{showActive ? "▲" : "▼"}</span>
    </button>

    {#if showActive}
        {#if data.active.length > 0}
            {#each data.active as a}
                <div class="card">
                    <div class="row">
                        <div class="info">
                            <strong>{a.amount} kr</strong><br />
                            <span class="label">Start:</span> {toMonthInput(a.start_month)}<br />
                            <span class="label">Slut:</span>
                            {#if a.end_month}
                                {toMonthInput(a.end_month)}
                            {:else}
                                aktiv
                            {/if}<br />
                            <span class="label">Skapad av:</span> {a.profiles?.full_name}
                        </div>

                        {#if data.access.canEdit}
                            <div class="actions">
                                <form method="post" action="?/update">
                                    <input type="hidden" name="selected_user_id" value={data.access.selectedUserId} />
                                    <input type="hidden" name="allowance_group_id" value={a.allowance_group_id} />

                                    <label for={"amount-" + a.id}>Nytt belopp</label>
                                    <input id={"amount-" + a.id} name="amount" type="number" required />

                                    <label for={"start-" + a.id}>Gäller från (YYYY-MM)</label>
                                    <input id={"start-" + a.id} name="start_month" type="month" required />

                                    <button>Uppdatera</button>
                                </form>

                                <form method="post" action="?/end">
                                    <input type="hidden" name="selected_user_id" value={data.access.selectedUserId} />
                                    <input type="hidden" name="allowance_group_id" value={a.allowance_group_id} />

                                    <label for={"end-" + a.id}>Avsluta från (YYYY-MM)</label>
                                    <input id={"end-" + a.id} name="end_month" type="month" required />

                                    <button class="danger">Avsluta</button>
                                </form>
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        {:else}
            <p class="empty">Inga aktiva perioder.</p>
        {/if}
    {/if}
</div>

<!-- Ny period -->
{#if data.access.canEdit}
<div class="section">
    <button class="section-header" on:click={() => showCreate = !showCreate}>
        <span>Ny fickpengperiod</span>
        <span>{showCreate ? "▲" : "▼"}</span>
    </button>

    {#if showCreate}
        <form method="post" action="?/create" class="create-form">
            <input type="hidden" name="selected_user_id" value={data.access.selectedUserId} />

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
{/if}

<!-- Historik -->
<div class="section">
    <button class="section-header" on:click={() => showHistory = !showHistory}>
        <span>Historik</span>
        <span>{showHistory ? "▲" : "▼"}</span>
    </button>

    {#if showHistory}
        {#if data.history.length > 0}
            {#each data.history as a}
                <div class="history">
                    {a.amount} kr — {toMonthInput(a.start_month)} → {toMonthInput(a.end_month)}
                    <br />
                    <span class="label">Skapad av:</span> {a.profiles?.full_name}
                </div>
            {/each}
        {:else}
            <p class="empty">Ingen historik ännu.</p>
        {/if}
    {/if}
</div>

<style>
    h1 {
        margin-bottom: 1rem;
    }

    .selector {
        margin-bottom: 1rem;
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    select {
        padding: 0.4rem;
        border-radius: 6px;
        border: 1px solid #d1d5db;
        background: white;
    }

    .section {
        background: #f3f6fb;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        margin-bottom: 1rem;
        padding: 0.5rem;
    }

    .section-header {
        width: 100%;
        background: none;
        border: none;
        font-size: 1rem;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        cursor: pointer;
    }

    .card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 0.75rem;
    }

    .row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
    }

    .info {
        line-height: 1.4;
    }

    .label {
        font-weight: bold;
        color: #555;
    }

    .actions {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        min-width: 200px;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    input, textarea {
        padding: 0.4rem;
        border-radius: 6px;
        border: 1px solid #d1d5db;
        font-size: 0.9rem;
    }

    button {
        padding: 0.5rem;
        border-radius: 6px;
        border: none;
        background: #2563eb;
        color: white;
        cursor: pointer;
        margin-top: 0.25rem;
    }

    button.danger {
        background: #dc2626;
    }

    .empty {
        padding: 0.5rem;
        color: #666;
        font-style: italic;
    }

    .history {
        padding: 0.5rem 0;
        border-bottom: 1px solid #e5e7eb;
    }
</style>
