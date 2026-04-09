"Checklistor"<script lang="ts">
    export let data;

    let showCreate = false;

    let title = "";
    let assigned_to = data.userId;
    let is_recurring = false;
    let notify_users: string[] = [];
</script>

<h1>Checklistor</h1>

<button on:click={() => showCreate = !showCreate}>
    Skapa ny checklista
</button>

{#if showCreate}
<form method="POST" action="?/create" class="create-box">
    <label>Titel</label>
    <input name="title" bind:value={title} required />

    <label>Tilldela till</label>
    <select name="assigned_to" bind:value={assigned_to}>
        <option value={data.userId}>Mig själv</option>
        <!-- Här kan du lägga in hushållets medlemmar -->
    </select>

    <label>
        <input type="checkbox" name="is_recurring" bind:checked={is_recurring} />
        Återkommande checklista
    </label>

    <label>Mottagare av mail</label>
    <select name="notify_users" multiple bind:value={notify_users}>
        <!-- Lägg in hushållets medlemmar -->
    </select>

    <button type="submit">Skapa</button>
</form>
{/if}

<h2>Mina checklistor</h2>

<ul>
    {#each data.lists as c}
        <li>
            <a href={`/checklistor/${c.id}`}>
                {c.title}
                {#if c.approved_at}
                    (Godkänd)
                {/if}
            </a>
        </li>
    {/each}
</ul>
<style src="./checklistor.css"></style>