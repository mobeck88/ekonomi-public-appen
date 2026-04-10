<script lang="ts">
    import "./checklistor.css";
    export let data;

    let newTitle = "";
    let assignedTo = data.userId; // default: mig själv
</script>

<h1>Checklistor</h1>

<!-- Skapa ny checklista -->
<div class="section">
    <div class="section-header">Skapa ny checklista</div>

    <form method="POST" action="?/create" class="create-form">
        <div>
            <label>Titel</label>
            <input name="title" bind:value={newTitle} required />
        </div>

        <div>
            <label>Tilldelas</label>
            <select name="assigned_to" bind:value={assignedTo} required>
                <option value={data.userId}>Mig själv</option>
                {#each data.members as m}
                    <option value={m.user_id}>{m.profiles.full_name}</option>
                {/each}
            </select>
        </div>

        <button type="submit">Skapa</button>
    </form>
</div>

<!-- Lista checklistor -->
<div class="section">
    <div class="section-header">Alla checklistor</div>

    {#if !data.checklists || data.checklists.length === 0}
        <div class="empty">Inga checklistor ännu.</div>
    {:else}
        <table>
            <thead>
                <tr>
                    <th>Titel</th>
                    <th>Tilldelad</th>
                    <th>Återkommande</th>
                    <th>Godkänd</th>
                    <th>Öppna</th>
                </tr>
            </thead>

            <tbody>
                {#each data.checklists as c}
                    <tr>
                        <td>{c.title}</td>
                        <td>
                            {#if c.assigned_to === data.userId}
                                Mig själv
                            {:else}
                                {#each data.members as m}
                                    {#if m.user_id === c.assigned_to}
                                        {m.profiles.full_name}
                                    {/if}
                                {/each}
                            {/if}
                        </td>
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
