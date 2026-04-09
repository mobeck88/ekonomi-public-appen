<script lang="ts">
    export let data;

    let newTitle = "";
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

        <button type="submit">Skapa</button>
    </form>
</div>

<!-- Lista alla checklistor -->
<div class="section">
    <div class="section-header">Alla checklistor</div>

    {#if !data.checklists || data.checklists.length === 0}
        <div class="empty">Inga checklistor ännu.</div>
    {:else}
        <ul style="list-style: none; padding: 1rem; margin: 0;">
            {#each data.checklists as checklist}
                <li style="padding: 0.5rem 0;">
                    <a
                        href={`/checklistor/${checklist.id}`}
                        style="font-size: 1rem; color: #2563eb; text-decoration: none;"
                    >
                        {checklist.title}
                    </a>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style src="./checklistor.css"></style>
