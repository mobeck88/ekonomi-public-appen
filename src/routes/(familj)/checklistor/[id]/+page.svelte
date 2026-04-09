<script lang="ts">
    export let data;

    let newText = "";
    let newDescription = "";
    let newDeadline = "";
</script>

<h1>{data.checklist.title}</h1>

{#if data.userId === data.checklist.created_by}
<form method="POST" action="?/addItem" class="create-box">
    <input type="hidden" name="checklist_id" value={data.checklist.id} />

    <label>Punkt</label>
    <input name="text" bind:value={newText} required />

    <label>Beskrivning</label>
    <textarea name="description" bind:value={newDescription}></textarea>

    <label>Deadline</label>
    <input type="date" name="deadline" bind:value={newDeadline} />

    <button type="submit">Lägg till</button>
</form>
{/if}

<ul class="items">
    {#each data.items as item}
        <li>
            <form method="POST" action="?/toggleItem">
                <input type="hidden" name="item_id" value={item.id} />

                <input
                    type="checkbox"
                    name="done"
                    value="true"
                    checked={item.done}
                    on:change={(e) => e.target.form.submit()}
                />

                <span>{item.text}</span>

                {#if item.deadline}
                    <span class="deadline">({item.deadline})</span>
                {/if}
            </form>
        </li>
    {/each}
</ul>

{#if data.userId === data.checklist.created_by}
<form method="POST" action="?/approve" class="approve-box">
    <input type="hidden" name="checklist_id" value={data.checklist.id} />
    <button type="submit">Godkänn</button>
</form>
{/if}

<style src="../checklistor.css"></style>
