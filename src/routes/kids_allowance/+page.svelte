<script lang="ts">
    export let data;

    let createChild = '';
    let createAmount = '';
    let createStart = '';
    let createTitle = '';
    let createDescription = '';
</script>

<h1>Barnens pengar</h1>

<h2>Aktiva perioder</h2>

{#if data.active && data.active.length > 0}
    {#each data.active as k}
        <div class="card">
            <div class="row">
                <div>
                    <strong>{k.child_name}</strong><br />
                    {k.amount} kr<br />
                    Start: {k.start_month}<br />
                    {#if k.end_month}
                        Slut: {k.end_month}
                    {:else}
                        Slut: aktiv
                    {/if}
                </div>

                <div class="actions">
                    <form method="post" action="?/update">
                        <input type="hidden" name="kids_group_id" value={k.kids_group_id} />

                        <label for={"amount-" + k.id}>Nytt belopp</label>
                        <input id={"amount-" + k.id} name="amount" type="number" required />

                        <label for={"start-" + k.id}>Gäller från (YYYY-MM)</label>
                        <input id={"start-" + k.id} name="start_month" type="month" required />

                        <button>Uppdatera</button>
                    </form>

                    <form method="post" action="?/end">
                        <input type="hidden" name="kids_group_id" value={k.kids_group_id} />

                        <label for={"end-" + k.id}>Avsluta från (YYYY-MM)</label>
                        <input id={"end-" + k.id} name="end_month" type="month" required />

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

<h2>Ny period</h2>

<form method="post" action="?/create" class="create-form">
    <label for="child_name">Barn</label>
    <input id="child_name" name="child_name" type="text" bind:value={createChild} required />

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
    {#each data.history as k}
        <div class="history">
            <strong>{k.child_name}</strong> — {k.amount} kr — {k.start_month} → {k.end_month}
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