<script lang="ts">
    export let data;

    // Servern skickar:
    // data.months: string[] (5 månader)
    // data.rows: { label: string; values: number[] }[]

    const months = data.months ?? [];
    const rows = data.rows ?? [];

    const rowMap = new Map();
    rows.forEach((r) => rowMap.set(r.label, r));

    function getRow(label: string) {
        return rowMap.get(label) ?? { label, values: months.map(() => 0) };
    }

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

    const sumIncome = getRow('Summa inkomst');
    const sumExpenses = getRow('Summa utgifter');
    const balance = getRow('Balans');
    const assist = getRow('Biståndsmånad');
    const calendar = getRow('Kalendermånad');
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

            <!-- INKOMSTER -->
            <tr class="bg-green-100 font-semibold">
                <td class="border px-2 py-1" colspan={1 + months.length}>Inkomster</td>
            </tr>

            {#each incomeRows as label}
                <tr class="bg-green-50">
                    <td class="border px-2 py-1">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border px-2 py-1 text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <!-- ÖVRIGA INKOMSTER -->
            <tr class="bg-green-100 font-semibold">
                <td class="border px-2 py-1" colspan={1 + months.length}>Övriga inkomster</td>
            </tr>

            {#each otherIncomeRows as label}
                <tr class="bg-green-50">
                    <td class="border px-2 py-1">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border px-2 py-1 text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <!-- SUMMA INKOMST -->
            <tr class="bg-green-200 font-semibold">
                <td class="border px-2 py-1">Summa inkomst</td>
                {#each sumIncome.values as v}
                    <td class="border px-2 py-1 text-right">{v} kr</td>
                {/each}
            </tr>

            <!-- UTGIFTER -->
            <tr class="bg-red-100 font-semibold">
                <td class="border px-2 py-1" colspan={1 + months.length}>Utgifter</td>
            </tr>

            {#each expenseRows as label}
                <tr class="bg-red-50">
                    <td class="border px-2 py-1">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border px-2 py-1 text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <!-- SUMMA UTGIFTER -->
            <tr class="bg-red-200 font-semibold">
                <td class="border px-2 py-1">Summa utgifter</td>
                {#each sumExpenses.values as v}
                    <td class="border px-2 py-1 text-right">{v} kr</td>
                {/each}
            </tr>

            <!-- BALANS -->
            <tr class="bg-gray-200 font-semibold">
                <td class="border px-2 py-1">Balans</td>
                {#each balance.values as v}
                    <td class="border px-2 py-1 text-right">{v} kr</td>
                {/each}
            </tr>

            <!-- BISTÅNDSMÅNAD -->
            <tr class="bg-gray-100">
                <td class="border px-2 py-1">Biståndsmånad</td>
                {#each assist.values as v}
                    <td class="border px-2 py-1 text-right">{v} kr</td>
                {/each}
            </tr>

            <!-- KALENDERMÅNAD -->
            <tr class="bg-gray-100">
                <td class="border px-2 py-1">Kalendermånad</td>
                {#each calendar.values as v}
                    <td class="border px-2 py-1 text-right">{v}</td>
                {/each}
            </tr>

        </tbody>
    </table>
</div>
