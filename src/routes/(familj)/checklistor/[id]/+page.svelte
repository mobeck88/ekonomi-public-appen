<script lang="ts">
    import "../checklistor.css";
    export let data;

    let newText = "";
    let newDescription = "";
    let newDeadline = "";
</script>

<h1>{data.checklist.title}</h1>

<!-- Lägg till punkt -->
<div class="section">
    <div class="section-header">Lägg till punkt</div>

    <form method="POST" action="?/addItem" class="create-form">
        <input type="hidden" name="checklist_id" value={data.checklist.id} />

        <div>
            <label>Punkt</label>
            <input name="text" bind:value={newText} required />
        </div>

        <div>
            <label>Beskrivning</label>
            <textarea name="description" bind:value={newDescription}></textarea>
        </div>

        <div>
            <label>Deadline</label>
            <input name="deadline" type="date" bind:value={newDeadline} />
        </div>

        <button type="submit">Lägg till</button>
    </form>
</div>

<!-- Lista punkter -->
<div class="section">
    <div class="section-header">Checklistepunkter</div>

    {#if data.items.length === 0}
        <div class="empty">Inga punkter ännu.</div>
    {:else}
        <table>
            <thead>
                <tr>
                    <th>Klar</th>
                    <th>Punkt</th>
                    <th>Deadline</th>
                </tr>
            </thead>

            <tbody>
                {#each data.items as item}
                    <tr>
                        <td>
                            <!-- ⭐ Detta formulär skickar korrekt -->
                            <form method="POST" action="?/toggleItem" style="display:inline;">
                                <input type="hidden" name="item_id" value={item.id} />
                                <input
                                    type="checkbox"
                                    checked={item.done}
                                    on:change={(e) => e.target.form.submit()}
                                />
                            </form>
                        </td>

                        <td>{item.text}</td>
                        <td>{item.deadline || ""}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>
