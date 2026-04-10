<script lang="ts">
    import "./unexpected_expenses.css";
    export let data;

    let date = '';
    let title = '';
    let description = '';
    let amount = '';
    let createOwner = 'shared';

    // Accordion states
    let showCreate = false;
    let showHistory = false;

    function ownerLabel(owner: string) {
        if (owner === "shared") return "Gemensamt";

        const match = data.members.find(m => m.user_id === owner);
        return match?.profiles?.full_name ?? owner;
    }
</script>

<h1>Oförutsägbara utgifter</h1>

<!-- ⭐ Sektion: Ny utgift -->
<div class="section">
    <button class="section-header" on:click={() => showCreate = !showCreate}>
        <span>Ny utgift</span>
        <span>{showCreate ? "▲" : "▼"}</span>
    </button>

    {#if showCreate}
        <form method="post" action="?/create" class="form">
            <label for="date">Datum</label>
            <input id="date" name="date" type="date" bind:value={date} required />

            <label for="title">Titel</label>
            <input id="title" name="title" type="text" bind:value={title} required />

            <label for="description">Beskrivning</label>
            <textarea id="description" name="description" rows="2" bind:value={description}></textarea>

            <label for="amount">Belopp</label>
            <input id="amount" name="amount" type="number" bind:value={amount} required />

            <label>Ägare</label>
            <select name="owner" bind:value={createOwner} required>
                <option value="shared">Gemensamt</option>
                {#each data.members as m}
                    <option value={m.user_id}>{m.profiles.full_name}</option>
                {/each}
            </select>

            <button>Spara</button>
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
        {#if data.entries.length > 0}
            {#each data.entries as e}
                <div class="card">
                    <strong>{e.date}</strong><br />
                    {e.title} — {e.amount} kr<br />
                    <span class="label">Ägare:</span> {ownerLabel(e.owner)}<br />

                    {#if e.description}
                        <span class="desc">{e.description}</span>
                    {/if}
                </div>
            {/each}
        {:else}
            <p class="empty">Inga utgifter registrerade ännu.</p>
        {/if}
    {/if}
</div>

