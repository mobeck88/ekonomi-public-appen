<script lang="ts">
    export let data;
</script>

<h1>Checklistor</h1>

<ul class="items">
    {#each data.checklists as checklist}
        <li>
            <a href={`/checklistor/${checklist.id}`}>
                {checklist.title}
            </a>
        </li>
    {/each}
</ul>

<style src="./checklistor.css"></style>
