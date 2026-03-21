<script lang="ts">
    export let data;

    const months = data.months ?? [];
    const rows = data.rows ?? [];
    const incomeRows = data.incomeRows ?? [];

    const monthNames = [
        'Januari','Februari','Mars','April','Maj','Juni',
        'Juli','Augusti','September','Oktober','November','December'
    ];

    function formatMonth(m) {
        const [y, mm] = m.split('-').map(Number);
        return monthNames[mm - 1];
    }

    function getYear(m) {
        return m.split('-')[0];
    }

    const otherIncomeRows = [
        'Dagersättning (FP)',
        'Dagersättning (VAB)',
        'Sjukersättning',
        'Övriga insättningar',
        'Överskridande överskott'
    ];

    const homeRows = [
        'Hyra','El','Hemförsäkring','Mat vuxen','Mat barn',
        'Övriga kostnad barn','Internet'
    ];

    const workRows = ['Facket','A-kassa (avgift)'];
    const societyRows = ['Barnomsorg'];
    const healthRows = ['Sjukhuskostnader','Mediciner'];

    const rowMap = new Map();
    rows.forEach((r) => rowMap.set(r.label, r));

    function getRow(label: string) {
        const r = rowMap.get(label);
        if (!r) return { label, values: months.map(() => 0) };
        if (!r.values) return { label, values: months.map(() => 0) };
        return r;
    }

    function isRowVisible(label: string) {
        const row = getRow(label);
        return row.values.some((v) => v !== 0 && v !== null && v !== '');
    }

    const sumIncome = getRow('Summa inkomst');
    const sumExpenses = getRow('Summa utgifter');
    const balance = getRow('Balans');
    const assist = getRow('Biståndsmånad');
    const calendar = getRow('Kalendermånad');
</script>

<style>
    thead th {
        position: sticky;
        top: 0;
        z-index: 10;
        background: #f3f4f6;
    }
    tbody tr:hover td { background-color: #f9fafb; }
    td, th { padding: 10px 12px; font-size: 0.9rem; }
    table {
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
    .section-header { background: #e5e7eb; font-weight: 700; font-size: 1rem; }
    .income-header { background: #bbf7d0; }
    .income-subheader { background: #d1fae5; }
    .expense-header { background: #fecaca; }
    .expense-subheader { background: #fee2e2; }
    .balance-row { background: #e5e7eb; font-weight: 600; }
</style>

<h1 class="text-2xl font-bold mb-6">Bistånd</h1>

<div class="overflow-x-auto">
    <table class="min-w-full text-sm border-collapse">
        <thead>
            <tr>
                <th class="border text-left">Kategori</th>
                {#each months as m}
                    <th class="border text-right">{getYear(m)}</th>
                {/each}
            </tr>
        </thead>

        <tbody>
            <tr class="section-header">
                <td class="border">Biståndsmånad</td>
                {#each assist.values as v}
                    <td class="border text-right">{formatMonth(v)}</td>
                {/each}
            </tr>

            <tr class="section-header">
                <td class="border">Kalendermånad</td>
                {#each calendar.values as v}
                    <td class="border text-right">{formatMonth(v)}</td>
                {/each}
            </tr>

            <tr class="income-header section-header">
                <td class="border" colspan={1 + months.length}>Inkomster</td>
            </tr>

            {#each incomeRows.filter(isRowVisible) as label}
                <tr class="bg-green-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <tr class="income-subheader section-header">
                <td class="border" colspan={1 + months.length}>Övriga inkomster</td>
            </tr>

            {#each otherIncomeRows.filter(isRowVisible) as label}
                <tr class="bg-green-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <tr class="income-header font-semibold">
                <td class="border">Summa inkomst</td>
                {#each sumIncome.values as v}
                    <td class="border text-right">{v}</td>
                {/each}
            </tr>

            <tr class="expense-header section-header">
                <td class="border" colspan={1 + months.length}>Utgifter</td>
            </tr>

            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Hem</td>
            </tr>

            {#each homeRows.filter(isRowVisible) as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Arbete</td>
            </tr>

            {#each workRows.filter(isRowVisible) as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Samhäll</td>
            </tr>

            {#each societyRows.filter(isRowVisible) as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Samhäll (vård)</td>
            </tr>

            {#each healthRows.filter(isRowVisible) as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <tr class="expense-header font-semibold">
                <td class="border">Summa utgifter</td>
                {#each sumExpenses.values as v}
                    <td class="border text-right">{v}</td>
                {/each}
            </tr>

            <tr class="balance-row">
                <td class="border">Balans</td>
                {#each balance.values as v}
                    <td class="border text-right">{v}</td>
                {/each}
            </tr>
        </tbody>
    </table>
</div>
