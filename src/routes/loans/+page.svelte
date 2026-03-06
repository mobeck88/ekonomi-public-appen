<script lang="ts">
    export let data;

    let createName = '';
    let createReference = '';
    let createAmount = '';
    let createStart = '';
</script>

<h1>Lån</h1>

<h2>Aktiva lån</h2>

{#if data.active && data.active.length > 0}
    {#each data.active as l}
        <div class="card">
            <div class="row">
                <div>
                    <strong>{l.loan_name}</strong><br />
                    Ref: {l.reference}<br />
                    {l.amount} kr/mån<br />
                    Start: {l.start_month}<br />
                    {#if l.end_month}
                        Slut: {l.end_month}
                    {:else}
                        Slut: aktiv
                    {/if}
                </div>

                <div class="actions">

                    <!-- UPPDATERA -->
                    <form method="post" action="?/update">
                        <input type="hidden" name="loan_group_id" value={l.loan_group_id} />

                        <label for={"update-amount-" + l.loan_group_id}>Nytt belopp</label>
                        <input
                            id={"update-amount-" + l.loan_group_id}
                            name="amount"
                            type="number"
                            required
                        />

                        <label for={"update-start-" + l.loan_group_id}>Gäller från (YYYY-MM)</label>
                        <input
                            id={"update-start-" + l.loan_group_id}
                            name="start_month"
                            type="month"
                            required
                        />

                        <button>Uppdatera</button>
                    </form>

                    <!-- AVSLUTA -->
                    <form method="post" action="?/end">
                        <input type="hidden" name="loan_group_id" value={l.loan_group_id} />

                        <label for={"end-month-" + l.loan_group_id}>Avsluta från (YYYY-MM)</label>
                        <input
                            id={"end-month-" + l.loan_group_id}
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
    <p>Inga aktiva lån.</p>
{/if}

<hr />

<h2>Nytt lån</h2>

<form method="post" action="?/create" class="create-form">

    <label for="create-name">Lånets namn</label>
    <input
        id="create-name"
        name="loan_name"
        type="text"
        bind:value={createName}
        required
    />

    <label for="create-ref">Referensnummer</label>
    <input
        id="create-ref"
        name="reference"
        type="text"
        bind:value={createReference}
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

<hr />

<h2>Historik</h2>

{#if data.history && data.history.length > 0}
    {#each data.history as l}
        <div class="history">
            {l.loan_name} — {l.amount} kr/mån — {l.start_month} → {l.end_month}
        </div>
    {/each}
{:else}
    <p>Ingen historik ännu.</p>
{/if}

<style>
    .card {
        border: 1px solid #ddd;
        padding: 1rem;
        margin-bottom: 1rem;
        border-radius: 6px;
    }
    .row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
    }
    .actions {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }
    .create-form {
        display: grid;
        gap: 0.5rem;
        max-width: 400px;
    }
    .danger {
        background: #b00020;
        color: white;
    }
</style>
