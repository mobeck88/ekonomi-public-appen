<script lang="ts">
    export let data;

    // Endast det absolut nödvändiga
    const months: string[] = data.months ?? [];
</script>

<h1 class="text-2xl font-bold mb-6">Ekonomiskt bistånd</h1>

<p class="text-gray-600 mb-4">
    Detta är en minimal version av sidan för felsökning.
</p>

{#if months.length === 0}
    <p>Inga månader hittades.</p>
{:else}
    <table class="min-w-full text-sm border-collapse">
        <thead>
            <tr>
                <th class="border p-2 text-left">Månad</th>
            </tr>
        </thead>
        <tbody>
            {#each months as m}
                <tr>
                    <td class="border p-2">{m}</td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}
