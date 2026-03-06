<script lang="ts">
    export let data;

    let createAmount = '';
    let createStart = '';
    let createTitle = '';
    let createDescription = '';
</script>

<h1>Fickpengar</h1>

<h2>Aktiva perioder</h2>

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
    <p>Inga aktiva perioder.</p>
{/if}

<hr />

<h2>Ny fickpeng-period</h2>

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

<hr />

<h2>Historik</h2>

{#if data.history && data.history.length > 0}
    {#each data.history as a}
        <div class="history">
            {a.amount} kr — {a.start_month} → {a.end_month}
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
