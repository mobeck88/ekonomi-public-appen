<script lang="ts">
    export let data;

    let month = '';
    let eonAmount = '';
    let tibberAmount = '';

    function toMonthInput(dateString: string | null) {
        if (!dateString) return "";
        return dateString.slice(0, 7);
    }

    let selectedUserId = data.access.selectedUserId;
    let selectable = data.access.selectableMembers;

    $: if (selectedUserId) {
        const url = new URL(window.location.href);
        url.searchParams.set('user_id', selectedUserId);
        history.replaceState({}, '', url);
    }

    let showForm = false;
    let showList = false;
</script>

<h1>Elkostnader</h1>

{#if selectable.length > 0}
    <div class="selector">
        <label>Användare</label>
        <select bind:value={selectedUserId}>
            {#each selectable as m}
                <option value={m.user_id}>{m.profiles.full_name}</option>
            {/each}
        </select>
    </div>
{/if}

<div class="section">
    <button class="section-header" on:click={() => showForm = !showForm}>
        <span>Lägg till / ändra månad</span>
        <span>{showForm ? "▲" : "▼"}</span>
    </button>

    {#if showForm}
        <form method="post" action="?/save" class="create-form">
            <input type="hidden" name="selected_user_id" value={selectedUserId} />

            <label for="month">Månad</label>
            <input id="month" name="month" type="month" bind:value={month} required />

            <label for="eon_amount">Nätägare</label>
            <input id="eon_amount" name="eon_amount" type="number" bind:value={eonAmount} required />

            <label for="tibber_amount">Elbolag</label>
            <input id="tibber_amount" name="tibber_amount" type="number" bind:value={tibberAmount} required />

            <button>Spara</button>
        </form>
    {/if}
</div>

<div class="section">
    <button class="section-header" on:click={() => showList = !showList}>
        <span>Alla månader</span>
        <span>{showList ? "▲" : "▼"}</span>
    </button>

    {#if showList}
        {#if data.entries.length > 0}
            {#each data.entries as row}
                <div class="card">
                    <div class="row">
                        <div class="info">
                            <strong>{toMonthInput(row.month)}</strong><br />
                            <span class="label">Nätägare:</span> {row.eon_amount} kr<br />
                            <span class="label">Elbolag:</span> {row.tibber_amount} kr<br />
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

    .selector {
        margin-bottom: 1.2rem;
        display: grid;
        gap: 0.4rem;
        max-width: 260px;
    }

    .selector select {
        padding: 0.6rem;
        border-radius: 8px;
        border: 1px solid #d1d5db;
        background: #f9fafb;
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
