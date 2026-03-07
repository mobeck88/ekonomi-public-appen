<script lang="ts">
    export let data;

    let month = '';
    let eonAmount = '';
    let tibberAmount = '';
</script>

<h1>Elkostnader</h1>

<h2>Lägg till / ändra månad</h2>

<form method="post" action="?/save" class="create-form">
    <label for="month">Månad</label>
    <input id="month" name="month" type="month" bind:value={month} required />

    <label for="eon_amount">E.ON (nätavgift)</label>
    <input id="eon_amount" name="eon_amount" type="number" bind:value={eonAmount} required />

    <label for="tibber_amount">Tibber (elhandel)</label>
    <input id="tibber_amount" name="tibber_amount" type="number" bind:value={tibberAmount} required />

    <button>Spara</button>
</form>

<hr />

<h2>Alla månader</h2>

{#if data.entries.length > 0}
    {#each data.entries as row}
        <div class="card">
            <strong>{row.month}</strong><br />
            E.ON: {row.eon_amount} kr<br />
            Tibber: {row.tibber_amount} kr
        </div>
    {/each}
{:else}
    <p>Inga registrerade månader ännu.</p>
{/if}

<style>
    .create-form {
        display: grid;
        gap: 0.5rem;
        max-width: 400px;
    }
    .card {
        border: 1px solid #ddd;
        padding: 1rem;
        margin-bottom: 1rem;
        border-radius: 6px;
    }
</style>