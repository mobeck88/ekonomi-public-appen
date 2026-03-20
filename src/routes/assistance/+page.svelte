<script lang="ts">
    export let data;

    // Förväntat från servern:
    // data.months: string[] (5 månader)
    // data.rows: { label: string; values: number[] }[]

    const months: string[] = data.months ?? [];
    const rows: { label: string; values: number[] }[] = data.rows ?? [];

    const rowMap = new Map<string, { label: string; values: number[] }>();
    rows.forEach((r) => rowMap.set(r.label, r));

    const incomeRows = [
        'Arbete',
        'A-kassa',
        'Försörjningsstöd',
        'Barnbidrag',
        'Bostadsbidrag',
        'Underhållsbidrag'
    ];

    const otherIncomeRows = [
        'Dagersättning (FP)',
        'Dagersättning (VAB)',
        'Sjukersättning',
        'Övriga insättningar',
        'Överskridande överskott'
    ];

    const expenseRows = [
        'Hyra',
        'El',
        'Hemförsäkring',
        'Mat vuxen',
        'Mat barn',
        'Övriga kostnad barn',
        'Internet',
        'Facket',
        'A-kassa (avgift)',
        'Barnomsorg',
        'Sjukhuskostnader',
        'Mediciner'
    ];

    function getRow(label: string) {
        return rowMap.get(label) ?? { label, values: months.map(() => 0) };
    }
</script>

<h1 class="text-2xl font-bold mb-6">Bistånd</h1>

<div class="overflow-x-auto border rounded bg-white">
    <table class="min-w-full text-sm border-collapse">
        <thead>
            <tr class="bg-gray-100">
                <th class="border px-2 py-1 text-left">Kategori</th>
                {#each months as m}
                    <th class="border px-2 py-1 text-right">{m}</th>
                {/each}
            </tr>
        </thead>

        <tbody>

            <!-- ========================= -->
            <!-- INKOMSTER -->
            <!-- ========================= -->
            <tr class="bg-green-100 font-semibold">
                <td class="border px-2 py-1" colspan={1 + months.length}>Inkomster</td>
            </tr>

            {#each incomeRows as label}
                {@const row = getRow(label)}
                <tr class="bg-green-50">
                    <td class="border px-2 py-1">{label}</td>
                    {#each row.values as v}
                        <td class="border px-2 py-1 text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <!-- ========================= -->
            <!-- ÖVRIGA INKOMSTER -->
            <!-- ========================= -->
            <tr class="bg-green-100 font-semibold">
                <td class="border px-2 py-1" colspan={1 + months.length}>Övriga inkomster</td>
            </tr>

            {#each otherIncomeRows as label}
                {@const row = getRow(label)}
                <tr class="bg-green-50">
                    <td class="border px-2 py-1">{label}</td>
                    {#each row.values as v}
                        <td class="border px-2 py-1 text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <!-- ========================= -->
            <!-- SUMMA INKOMST -->
            <!-- ========================= -->
            {@const sumIncome = getRow('Summa inkomst')}
            <tr class="bg-green-200 font-semibold">
                <td class="border px-2 py-1">Summa inkomst</td>
                {#each sumIncome.values as v}
                    <td class="border px-2 py-1 text-right">{v} kr</td>
                {/each}
            </tr>

            <!-- ========================= -->
            <!-- UTGIFTER -->
            <!-- ========================= -->
            <tr class="bg-red-100 font-semibold">
                <td class="border px-2 py-1" colspan={1 + months.length}>Utgifter</td>
            </tr>

            {#each expenseRows as label}
                {@const row = getRow(label)}
                <tr class="bg-red-50">
                    <td class="border px-2 py-1">{label}</td>
                    {#each row.values as v}
                        <td class="border px-2 py-1 text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <!-- ========================= -->
            <!-- SUMMA UTGIFTER -->
            <!-- ========================= -->
            {@const sumExp = getRow('Summa utgifter')}
            <tr class="bg-red-200 font-semibold">
                <td class="border px-2 py-1">Summa utgifter</td>
                {#each sumExp.values as v}
                    <td class="border px-2 py-1 text-right">{v} kr</td>
                {/each}
            </tr>

            <!-- ========================= -->
            <!-- BALANS -->
            <!-- ========================= -->
            {@const balance = getRow('Balans')}
            <tr class="bg-gray-200 font-semibold">
                <td class="border px-2 py-1">Balans</td>
                {#each balance.values as v}
                    <td class="border px-2 py-1 text-right">{v} kr</td>
                {/each}
            </tr>

            <!-- ========================= -->
            <!-- BISTÅNDSMÅNAD -->
            <!-- ========================= -->
            {@const assist = getRow('Biståndsmånad')}
            <tr class="bg-gray-100">
                <td class="border px-2 py-1">Biståndsmånad</td>
                {#each assist.values as v}
                    <td class="border px-2 py-1 text-right">{v} kr</td>
                {/each}
            </tr>

            <!-- ========================= -->
            <!-- KALENDERMÅNAD -->
            <!-- ========================= -->
            {@const cal = getRow('Kalendermånad')}
            <tr class="bg-gray-100">
                <td class="border px-2 py-1">Kalendermånad</td>
                {#each cal.values as v}
                    <td class="border px-2 py-1 text-right">{v}</td>
                {/each}
            </tr>

        </tbody>
    </table>
</div>
