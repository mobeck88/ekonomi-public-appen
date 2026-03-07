<script lang="ts">
    export let data;

    let createName = '';
    let createAmount = '';
    let createStart = '';
</script>

<h1>Fasta kostnader</h1>

<h2>Aktiva kostnader</h2>

{#if data.active && data.active.length > 0}
    {#each data.active as c}
        <div class="card">
            <div class="row">
                <div>
                    <strong>{c.cost_name}</strong><br />
                    {c.amount} kr/mån<br />
                    Start: {c.start_month}<br />
                    {#if c.end_month}
                        Slut: {c.end_month}
                    {:else}
                        Slut: aktiv
                    {/if}
                </div>

                <div class="actions">

                    <!-- UPPDATERA -->
                    <form method="post" action="?/update">
                        <input type="hidden" name="cost_group_id" value={c.cost_group_id} />
                        <input type="hidden" name="user_id" value={c.user_id} />

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
                        <input type="hidden" name="user_id" value={c.user_id} />

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
    <p>Inga aktiva kostnader.</p>
{/if}

<hr />

<h2>Ny kostnad</h2>

<form method="post" action="?/create" class="create-form">

    <!-- KRITISKT: user_id måste skickas med -->
    <input type="hidden" name="user_id" value={data.user_id} />

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

<hr />

<h2>Historik</h2>

{#if data.history && data.history.length > 0}
    {#each data.history as c}
        <div class="history">
            {c.cost_name} — {c.amount} kr/mån — {c.start_month} → {c.end_month}
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