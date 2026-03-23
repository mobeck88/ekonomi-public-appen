<script lang="ts">
    export let data;

    const months: string[] = data.months ?? [];
    const rows = data.rows ?? [];
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
        {#each rows as row}
            <tr>
                <td class="border p-2">{row.label}</td>
                {#each row.values as v}
                    <td class="border p-2">{v}</td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
