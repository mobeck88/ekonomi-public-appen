<script lang="ts">
    export let data;

    let createAmount = '';
    let createStart = '';
    let createTitle = '';
    let createDescription = '';
</script>

<h1>Abonnemang</h1>

<h2>Aktiva abonnemang</h2>

{#if data.active && data.active.length > 0}
    {#each data.active as sub}
        <div class="card">
            <div class="row">
                <div>
                    <strong>{sub.amount} kr</strong><br />
                    Start: {sub.start_month}<br />
                    {#if sub.end_month}
                        Slut: {sub.end_month}
                    {:else}
                        Slut: aktiv
                    {/if}
                </div>
                <div class="actions">
                    <form method="post" action="?/update">
                        <input type="hidden" name="subscription_group_id" value={sub.subscription_group_id} />

                        <label for={"amount-" + sub.id}>Nytt belopp</label>
                        <input id={"amount-" + sub.id} name="amount" type="number" step="1" required />

                        <label for={"start-" + sub.id}>Gäller från (YYYY-MM)</label>
                        <input id={"start-" + sub.id} name="start_month" type="month" required />

                        <button>Uppdatera</button>
                    </form>

                    <form method="post" action="?/end">
                        <input type="hidden" name="subscription_group_id" value={sub.subscription_group_id} />

                        <label for={"end-" + sub.id}>Avsluta från och med (YYYY-MM)</label>
                        <input id={"end-" + sub.id} name="end_month" type="month" required />

                        <button class="danger">Avsluta</button>
                    </form>
                </div>
            </div>
        </div>
    {/each}
{:else}
    <p>Inga aktiva abonnemang.</p>
{/if}

<hr />

<h2>Nytt abonnemang</h2>

<form method="post" action="?/create" class="create-form">
    <label for="title">Rubrik</label>
    <input id="title" name="title" type="text" bind:value={createTitle} required />

    <label for="description">Beskrivning</label>
    <textarea id="description" name="description" rows="2" bind:value={createDescription}></textarea>

    <label for="amount">Belopp</label>
    <input id="amount" name="amount" type="number" step="1" bind:value={createAmount} required />

    <label for="start_month">Startmånad (YYYY-MM)</label>
    <input id="start_month" name="start_month" type="month" bind:value={createStart} required />

    <button>Skapa</button>
</form>

<hr />

<h2>Historik</h2>

{#if data.history && data.history.length > 0}
    {#each data.history as sub}
        <div class="history">
            {sub.amount} kr — {sub.start_month} → {sub.end_month}
        </div>
    {/each}
{:else}
    <p>Ingen historik ännu.</p>
{/if}

<style>
    h1 {
        margin-bottom: 1rem;
    }
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
    .actions form {
        margin-bottom: 0.5rem;
    }
    .create-form {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.5rem;
        max-width: 400px;
    }
    label {
        font-weight: 600;
    }
    input,
    textarea {
        width: 100%;
        box-sizing: border-box;
    }
    .history {
        opacity: 0.7;
        margin-bottom: 0.25rem;
    }
    button {
        margin-top: 0.5rem;
    }
    .danger {
        background: #b00020;
        color: white;
    }
</style>