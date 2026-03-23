<script lang="ts">
    export let data;

    const months: string[] = data.months ?? [];
    const rows = data.rows ?? [];

    // Hämta raderna för biståndsmånad och kalendermånad
    const assist = rows.find((r) => r.label === 'Biståndsmånad');
    const calendar = rows.find((r) => r.label === 'Kalendermånad');
</script>

<h1 class="text-2xl font-bold mb-6">Ekonomiskt bistånd</h1>

<table class="min-w-full text-sm border-collapse">
    <thead>
        <tr>
            <th class="border p-2 text-left">Kategori</th>
            {#each months as m}
                <th class="border p-2 text-left">{m}</th>
            {/each}
        </tr>
    </thead>

    <tbody>
        {#if assist}
            <tr>
                <td class="border p-2 font-semibold">Biståndsmånad</td>
                {#each assist.values as v}
                    <td class="border p-2">{v}</td>
                {/each}
            </tr>
        {/if}

        {#if calendar}
            <tr>
                <td class="border p-2 font-semibold">Kalendermånad</td>
                {#each calendar.values as v}
                    <td class="border p-2">{v}</td>
                {/each}
            </tr>
        {/if}

        {#each rows as row}
            {#if row.label !== 'Biståndsmånad' && row.label !== 'Kalendermånad'}
                <tr>
                    <td class="border p-2">{row.label}</td>
                    {#each row.values as v}
                        <td class="border p-2">{v}</td>
                    {/each}
                </tr>
            {/if}
        {/each}
    </tbody>
</table>
