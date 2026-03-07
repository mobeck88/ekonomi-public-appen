<script lang="ts">
    export let data;

    let createTitle = '';
    let createDescription = '';
    let createAmount = '';
    let createInterval = '1';
    let createOwner = 'A';
    let createStart = '';
</script>

<h1>Utgifter</h1>

<h2>Aktiva utgifter</h2>

{#if data.active && data.active.length > 0}
    {#each data.active as e}
        <div class="card">
            <div class="row">
                <div>
                    <strong>{e.title}</strong><br />
                    {e.amount} kr<br />
                    Intervall: var {e.interval_months} månad(er)<br />
                    Ägare: {e.owner}<br />
                    Start: {e.start_month}<br />
                    {#if e.end_month}
                        Slut: {e.end_month}
                    {:else}
                        Slut: aktiv
                    {/if}
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

                        <label for={"owner-" + e.id}>Ägare</label>
                        <select id={"owner-" + e.id} name="owner" required>
                            <option value="A">Andreas</option>
                            <option value="H">Hanna</option>
                            <option value="A+H">Båda</option>
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
    <p>Inga aktiva utgifter.</p>
{/if}

<hr />

<h2>Ny utgift</h2>

<form method="post" action="?/create" class="create-form">
    <label for="title">Rubrik</label>
    <input id="title" name="title" type="text" bind:value={createTitle} required />

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

    <label for="owner">Ägare</label>
    <select id="owner" name="owner" bind:value={createOwner} required>
        <option value="A">Andreas</option>
        <option value="H">Hanna</option>
        <option value="A+H">Båda</option>
    </select>

    <label for="start_month">Startmånad (YYYY-MM)</label>
    <input id="start_month" name="start_month" type="month" bind:value={createStart} required />

    <button>Skapa</button>
</form>

<hr />

<h2>Historik</h2>

{#if data.history && data.history.length > 0}
    {#each data.history as e}
        <div class="history">
            {e.title} — {e.amount} kr — var {e.interval_months} månad(er) — {e.owner} — {e.start_month} → {e.end_month}
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