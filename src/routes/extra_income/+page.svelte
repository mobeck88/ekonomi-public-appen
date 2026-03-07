<script lang="ts">
    export let data;

    let date = '';
    let title = '';
    let description = '';
    let amount = '';
</script>

<h1>Extra inkomster</h1>

<h2>Ny inkomst</h2>

<form method="post" action="?/create" class="form">
    <label for="date">Datum</label>
    <input id="date" name="date" type="date" bind:value={date} required />

    <label for="title">Titel</label>
    <input id="title" name="title" type="text" bind:value={title} required />

    <label for="description">Beskrivning</label>
    <textarea id="description" name="description" rows="2" bind:value={description}></textarea>

    <label for="amount">Belopp</label>
    <input id="amount" name="amount" type="number" bind:value={amount} required />

    <button>Spara</button>
</form>

<hr />

<h2>Historik</h2>

{#if data.entries.length > 0}
    {#each data.entries as e}
        <div class="card">
            <strong>{e.date}</strong><br />
            {e.title} — {e.amount} kr<br />
            {#if e.description}{e.description}{/if}
        </div>
    {/each}
{:else}
    <p>Inga extra inkomster registrerade ännu.</p>
{/if}

<style>
    .form {
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