<script lang="ts">
    export let data;

    let date = '';
    let amount = '';
    let owner = 'shared';

    let editingId: string | null = null;

    let showCreate = false;
    let showHistory = false;

    function ownerLabel(owner: string) {
        if (owner === "shared") return "Gemensamt";

        const match = data.members.find((m) => m.user_id === owner);
        return match?.profiles?.full_name ?? owner;
    }

    function startEdit(entry) {
        editingId = entry.id;
        date = entry.date;
        amount = entry.amount;
        owner = entry.owner;
        showCreate = false;
        showHistory = true;
    }

    function cancelEdit() {
        editingId = null;
        date = '';
        amount = '';
        owner = 'shared';
    }
</script>

<h1>Ekonomiskt bistånd</h1>

<!-- NY POST -->
<div class="section">
    <button class="section-header" on:click={() => (showCreate = !showCreate)}>
        <span>Ny registrering</span>
        <span>{showCreate ? '▲' : '▼'}</span>
    </button>

    {#if showCreate}
        <form method="post" action="?/create" class="form">
            <label for="date">Datum</label>
            <input id="date" name="date" type="date" bind:value={date} required />

            <label for="amount">Belopp</label>
            <input id="amount" name="amount" type="number" bind:value={amount} required />

            <label for="owner">Ägare</label>
            <select id="owner" name="owner" bind:value={owner} required>
                <option value="shared">Gemensamt</option>
                {#each data.members as m}
                    <option value={m.user_id}>{m.profiles.full_name}</option>
                {/each}
            </select>

            <button>Spara</button>
        </form>
    {/if}
</div>

<!-- HISTORIK -->
<div class="section">
    <button class="section-header" on:click={() => (showHistory = !showHistory)}>
        <span>Historik</span>
        <span>{showHistory ? '▲' : '▼'}</span>
    </button>

    {#if showHistory}
        {#if data.entries.length > 0}
            {#each data.entries as e}
                <div class="card" on:click={() => startEdit(e)}>
                    <strong>{e.date}</strong><br />
                    Ekonomiskt bistånd — {e.amount} kr<br />
                    <span class="label">Ägare:</span> {ownerLabel(e.owner)}
                </div>
            {/each}
        {:else}
            <p class="empty">Inget ekonomiskt bistånd registrerat ännu.</p>
        {/if}
    {/if}
</div>

<!-- REDIGERING -->
{#if editingId}
    <div class="section">
        <button class="section-header">
            <span>Redigera post</span>
        </button>

        <form method="post" action="?/update" class="form">
            <input type="hidden" name="id" value={editingId} />

            <label for="date_edit">Datum</label>
            <input id="date_edit" name="date" type="date" bind:value={date} required />

            <label for="amount_edit">Belopp</label>
            <input id="amount_edit" name="amount" type="number" bind:value={amount} required />

            <label for="owner_edit">Ägare</label>
            <select id="owner_edit" name="owner" bind:value={owner} required>
                <option value="shared">Gemensamt</option>
                {#each data.members as m}
                    <option value={m.user_id}>{m.profiles.full_name}</option>
                {/each}
            </select>

            <button>Spara ändringar</button>
            <button type="button" on:click={cancelEdit} style="background:#9ca3af;">Avbryt</button>
        </form>
    </div>
{/if}

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
        font-size: 0.95rem;
        color: #374151;
        cursor: pointer;
    }

    .card:hover {
        background: #f9fafb;
    }

    .label {
        color: #6b7280;
        font-size: 0.85rem;
    }

    .form {
        display: grid;
        gap: 0.9rem;
        padding: 1rem;
        max-width: 420px;
    }

    input, select {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    input:focus, select:focus {
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
