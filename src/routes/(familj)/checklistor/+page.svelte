<script lang="ts">
    import "./checklistor.css";
    export let data;

    let newTitle = "";
</script>

<h1>Checklistor</h1>

<div class="section">
    <div class="section-header">Skapa ny checklista</div>

    <form method="POST" action="?/create" class="create-form">
        <div>
            <label>Titel</label>
            <input name="title" bind:value={newTitle} required />
        </div>

        <button type="submit">Skapa</button>
    </form>
</div>

<div class="section">
    <div class="section-header">Alla checklistor</div>

    {#if !data.checklists || data.checklists.length === 0}
        <div class="empty">Inga checklistor ännu.</div>
    {:else}
        <table>
            <thead>
                <tr>
                    <th>Titel</th>
                    <th>Återkommande</th>
                    <th>Godkänd</th>
                    <th>Öppna</th>
                </tr>
            </thead>

            <tbody>
                {#each data.checklists as c}
                    <tr>
                        <td>{c.title}</td>
                        <td>{c.is_recurring ? "Ja" : "Nej"}</td>
                        <td>{c.approved_at ? "Ja" : "Nej"}</td>
                        <td>
                            <a href={`/checklistor/${c.id}`} style="color:#2563eb;">Öppna</a>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>
