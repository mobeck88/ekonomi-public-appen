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

<h1>Fickpengar</h1>

<!-- ⭐ Sektion: Aktiva perioder -->
<div class="section">
    <button class="section-header" on:click={() => showActive = !showActive}>
        <span>Aktiva perioder</span>
        <span>{showActive ? "▲" : "▼"}</span>
    </button>

    {#if showActive}
        {#if data.active && data.active.length > 0}
            {#each data.active as a}
                <div class="card">
                    <div class="row">
                        <div>
                            <strong>{a.amount} kr</strong><br />
                            Start: {a.start_month}<br />
                            {#if a.end_month}
                                Slut: {a.end_month}
                            {:else}
                                Slut: aktiv
                            {/if}
                        </div>

                        <div class="actions">
                            <form method="post" action="?/update">
                                <input type="hidden" name="allowance_group_id" value={a.allowance_group_id} />

                                <label for={"amount-" + a.id}>Nytt belopp</label>
                                <input id={"amount-" + a.id} name="amount" type="number" required />

                                <label for={"start-" + a.id}>Gäller från (YYYY-MM)</label>
                                <input id={"start-" + a.id} name="start_month" type="month" required />

                                <button>Uppdatera</button>
                            </form>

                            <form method="post" action="?/end">
                                <input type="hidden" name="allowance_group_id" value={a.allowance_group_id} />

                                <label for={"end-" + a.id}>Avsluta från (YYYY-MM)</label>
                                <input id={"end-" + a.id} name="end_month" type="month" required />

                                <button class="danger">Avsluta</button>
                            </form>
                        </div>
                    </div>
                </div>
            {/each}
        {:else}
            <p class="empty">Inga aktiva perioder.</p>
        {/if}
    {/if}
</div>

<!-- ⭐ Sektion: Ny fickpengperiod -->
<div class="section">
    <button class="section-header" on:click={() => showCreate = !showCreate}>
        <span>Ny fickpengperiod</span>
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
            {#each data.history as a}
                <div class="history">
                    {a.amount} kr — {a.start_month} → {a.end_month}
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

    /* Sektioner */
    .section {
        margin-bottom: 1.5rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
        background: #fff;
    }

    .section-header {
        width: 100%;
        background: #f7f7f7;
        border: none;
        padding: 0.9rem 1rem;
        font-size: 1.1rem;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        cursor: pointer;
    }

    .empty {
        padding: 1rem;
        color: #666;
    }

    /* Cards */
    .card {
        border-top: 1px solid #eee;
        padding: 1rem;
    }

    .row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
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
        gap: 0.7rem;
        padding: 1rem;
        max-width: 400px;
    }

    input, textarea {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 6px;
    }

    button {
        padding: 0.6rem 1rem;
        border: none;
        background: #0077ff;
        color: white;
        border-radius: 6px;
        cursor: pointer;
    }

    button.danger {
        background: #b00020;
    }

    .history {
        padding: 0.8rem 1rem;
        border-top: 1px solid #eee;
    }
</style>
