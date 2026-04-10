<script lang="ts">
    import "./fixed_costs.css";
    export let data;

    let createName = '';
    let createAmount = '';
    let createStart = '';
    let createOwner = 'shared';

    // Accordion states
    let showActive = false;
    let showCreate = false;
    let showHistory = false;

    function ownerLabel(owner: string) {
        if (owner === "shared") return "Gemensamt";

        const match = data.members.find(m => m.user_id === owner);
        return match?.profiles?.full_name ?? owner;
    }

    function toMonth(dateString: string | null) {
        if (!dateString) return "";
        return dateString.slice(0, 7);
    }
</script>

<h1>Fasta kostnader</h1>

<!-- ⭐ Sektion: Aktiva kostnader -->
<div class="section">
    <button class="section-header" on:click={() => showActive = !showActive}>
        <span>Aktiva kostnader</span>
        <span>{showActive ? "▲" : "▼"}</span>
    </button>

    {#if showActive}
        {#if data.active && data.active.length > 0}
            {#each data.active as c}
                <div class="card">
                    <div class="row">
                        <div class="info">
                            <strong>{c.cost_name}</strong><br />
                            {c.amount} kr/mån<br />
                            <span class="label">Ägare:</span> {ownerLabel(c.owner)}<br />
                            <span class="label">Start:</span> {toMonth(c.start_month)}<br />
                            <span class="label">Slut:</span>
                            {#if c.end_month}
                                {toMonth(c.end_month)}
                            {:else}
                                aktiv
                            {/if}
                        </div>

                        <div class="actions">

                            <!-- UPPDATERA -->
                            <form method="post" action="?/update">
                                <input type="hidden" name="cost_group_id" value={c.cost_group_id} />

                                <label>Nytt belopp</label>
                                <input name="amount" type="number" required />

                                <label>Ny ägare</label>
                                <select name="owner" required>
                                    <option value="shared">Gemensamt</option>
                                    {#each data.members as m}
                                        <option value={m.user_id}>{m.profiles.full_name}</option>
                                    {/each}
                                </select>

                                <label>Gäller från (YYYY-MM)</label>
                                <input name="start_month" type="month" required />

                                <button>Uppdatera</button>
                            </form>

                            <!-- AVSLUTA -->
                            <form method="post" action="?/end">
                                <input type="hidden" name="cost_group_id" value={c.cost_group_id} />

                                <label>Avsluta från (YYYY-MM)</label>
                                <input name="end_month" type="month" required />

                                <button class="danger">Avsluta</button>
                            </form>

                        </div>
                    </div>
                </div>
            {/each}
        {:else}
            <p class="empty">Inga aktiva kostnader.</p>
        {/if}
    {/if}
</div>

<!-- ⭐ Sektion: Ny kostnad -->
<div class="section">
    <button class="section-header" on:click={() => showCreate = !showCreate}>
        <span>Ny kostnad</span>
        <span>{showCreate ? "▲" : "▼"}</span>
    </button>

    {#if showCreate}
        <form method="post" action="?/create" class="create-form">

            <label>Kostnadens namn</label>
            <input name="cost_name" type="text" bind:value={createName} required />

            <label>Belopp per månad</label>
            <input name="amount" type="number" bind:value={createAmount} required />

            <label>Ägare</label>
            <select name="owner" bind:value={createOwner} required>
                <option value="shared">Gemensamt</option>
                {#each data.members as m}
                    <option value={m.user_id}>{m.profiles.full_name}</option>
                {/each}
            </select>

            <label>Startmånad (YYYY-MM)</label>
            <input name="start_month" type="month" bind:value={createStart} required />

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
            {#each data.history as c}
                <div class="history">
                    <strong>{c.cost_name}</strong><br />
                    {c.amount} kr/mån<br />
                    <span class="label">Ägare:</span> {ownerLabel(c.owner)}<br />
                    {toMonth(c.start_month)} → {toMonth(c.end_month)}
                </div>
            {/each}
        {:else}
            <p class="empty">Ingen historik ännu.</p>
        {/if}
    {/if}
</div>

