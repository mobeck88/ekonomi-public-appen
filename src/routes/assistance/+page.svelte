<script lang="ts">
    export let data;

    const months: string[] = data.months ?? [];
    const rows = data.rows ?? [];

    const assist = rows.find((r) => r.label === 'Biståndsmånad');
    const calendar = rows.find((r) => r.label === 'Kalendermånad');

    const incomeRows = rows.filter((r) =>
        r.label !== 'Biståndsmånad' &&
        r.label !== 'Kalendermånad' &&
        !r.label.startsWith('Riksnorm') &&
        !r.label.startsWith('Summa') &&
        !r.label.startsWith('Balans') &&
        ![
            'Hyra', 'El', 'Hemförsäkring', 'Mat vuxen', 'Mat barn',
            'Övriga kostnad barn', 'Internet', 'Facket', 'A-kassa (avgift)',
            'Barnomsorg', 'Sjukhuskostnader', 'Mediciner'
        ].includes(r.label)
    );

    const expenseRows = rows.filter((r) =>
        [
            'Hyra', 'El', 'Hemförsäkring', 'Mat vuxen', 'Mat barn',
            'Övriga kostnad barn', 'Internet', 'Facket', 'A-kassa (avgift)',
            'Barnomsorg', 'Sjukhuskostnader', 'Mediciner'
        ].includes(r.label)
    );

    const riksnormRows = rows.filter((r) =>
        r.label.startsWith('Riksnorm')
    );

    function formatMonth(value: unknown): string {
        const s = String(value ?? '');
        const [year, month] = s.split('-');
        if (!year || !month) return s;
        return `${month}-${year}`;
    }
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
                    <td class="border p-2">{formatMonth(v)}</td>
                {/each}
            </tr>
        {/if}

        {#if calendar}
            <tr>
                <td class="border p-2 font-semibold">Kalendermånad</td>
                {#each calendar.values as v}
                    <td class="border p-2">{formatMonth(v)}</td>
                {/each}
            </tr>
        {/if}

        <tr>
            <td colspan={months.length + 1} class="border p-2 font-bold bg-gray-100">
                Inkomster
            </td>
        </tr>

        {#each incomeRows as row}
            <tr>
                <td class="border p-2">{row.label}</td>
                {#each row.values as v}
                    <td class="border p-2">{v}</td>
                {/each}
            </tr>
        {/each}

        <tr>
            <td colspan={months.length + 1} class="border p-2 font-bold bg-gray-100">
                Utgifter
            </td>
        </tr>

        {#each expenseRows as row}
            <tr>
                <td class="border p-2">{row.label}</td>
                {#each row.values as v}
                    <td class="border p-2">{v}</td>
                {/each}
            </tr>
        {/each}

        <tr>
            <td colspan={months.length + 1} class="border p-2 font-bold bg-gray-100">
                Riksnorm
            </td>
        </tr>

        {#each riksnormRows as row}
            <tr>
                <td class="border p-2">{row.label}</td>
                {#each row.values as v}
                    <td class="border p-2">{v}</td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
