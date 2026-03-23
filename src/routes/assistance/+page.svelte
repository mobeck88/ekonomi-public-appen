<script lang="ts">
    export let data;

    // --- Helper to guarantee arrays ---
    function safeArray<T>(v: any): T[] {
        return Array.isArray(v) ? v : [];
    }

    // --- Safe incoming data ---
    const months: string[] = safeArray<string>(data?.months);
    const incomeRows: string[] = safeArray<string>(data?.incomeRows);
    const rows: { label: string; values: any[] }[] = safeArray(data?.rows);

    // --- Build safe row map ---
    const rowMap: Record<string, any[]> = {};
    for (const r of rows) {
        rowMap[r.label] = safeArray(r.values);
    }

    function getRow(label: string) {
        return safeArray(rowMap[label] ?? months.map(() => 0));
    }

    function isRowVisible(label: string) {
        return getRow(label).some((v) => v !== 0 && v !== null && v !== "");
    }

    // --- Month helpers ---
    const monthNames = [
        'Januari','Februari','Mars','April','Maj','Juni',
        'Juli','Augusti','September','Oktober','November','December'
    ];

    function formatMonth(m: string) {
        if (!m || typeof m !== "string") return "";
        const parts = m.split("-");
        if (parts.length < 2) return "";
        const mm = Number(parts[1]);
        return monthNames[mm - 1] ?? "";
    }

    function getYear(m: string) {
        return m?.split("-")?.[0] ?? "";
    }

    // --- Categories ---
    const homeRows = ['Hyra','El','Hemförsäkring','Mat vuxen','Mat barn','Övriga kostnad barn','Internet'];
    const workRows = ['Facket','A-kassa (avgift)'];
    const societyRows = ['Barnomsorg'];
    const healthRows = ['Sjukhuskostnader','Mediciner'];
    const riksnormRows = ['Riksnorm vuxen','Riksnorm barn','Riksnorm hushåll'];

    // --- Corrections ---
    let incomeCorrection = [...getRow("Korrigering inkomst")];
    let expenseCorrection = [...getRow("Korrigering utgift")];

    // --- Summaries ---
    let sumIncome = [...getRow("Summa inkomst")];
    let sumExpenses = [...getRow("Summa utgifter")];
    let balance = [...getRow("Balans")];

    // --- Assist & calendar ---
    const assist = safeArray<string>(getRow("Biståndsmånad"));
    const calendar = safeArray<string>(getRow("Kalendermånad"));

    // --- Recalc ---
    function recalc() {
        sumIncome = months.map((_, i) => {
            let total = 0;
            for (const label of incomeRows) {
                total += Number(getRow(label)[i] ?? 0);
            }
            total += Number(incomeCorrection[i] ?? 0);
            return total;
        });

        const expenseLabels = [
            ...homeRows,
            ...workRows,
            ...societyRows,
            ...healthRows,
            ...riksnormRows
        ];

        sumExpenses = months.map((_, i) => {
            let total = 0;
            for (const label of expenseLabels) {
                total += Number(getRow(label)[i] ?? 0);
            }
            total += Number(expenseCorrection[i] ?? 0);
            return total;
        });

        balance = months.map((_, i) => sumIncome[i] - sumExpenses[i]);
    }

    // --- Save correction ---
    let saving = false;
    let saveError: string | null = null;
    let saveTimeout: any = null;

    async function saveCorrection(type: "income" | "expense", month: string, value: string) {
        saving = true;
        saveError = null;

        try {
            const res = await fetch("/assistance/updateCorrection", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, month, amount: Number(value || 0) })
            });

            if (!res.ok) saveError = "Kunde inte spara korrigering.";
        } catch {
            saveError = "Kunde inte spara korrigering.";
        }

        saving = false;
    }

    function onCorrectionInput(type: "income" | "expense", month: string, index: number, event: Event) {
        const target = event.target as HTMLInputElement;
        const num = Number(target.value || 0);

        if (type === "income") incomeCorrection[index] = num;
        else expenseCorrection[index] = num;

        recalc();

        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => saveCorrection(type, month, target.value), 400);
    }
</script>

<style>
    thead th { position: sticky; top: 0; z-index: 10; background: #f3f4f6; }
    tbody tr:hover td { background-color: #f9fafb; }
    td, th { padding: 10px 12px; font-size: 0.9rem; }
    table { border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.08); }
    .section-header { background: #e5e7eb; font-weight: 700; font-size: 1rem; }
    .income-header { background: #bbf7d0; }
    .expense-header { background: #fecaca; }
    .expense-subheader { background: #fee2e2; }
    .balance-row { background: #e5e7eb; font-weight: 600; }
    input[type='number'] {
        width: 100%; text-align: right; border: 1px solid #d1d5db;
        border-radius: 4px; padding: 2px 4px; font-size: 0.85rem;
    }
</style>

<h1 class="text-2xl font-bold mb-6">Bistånd</h1>

{#if saving}
    <p class="text-xs text-gray-500 mb-2">Sparar korrigering...</p>
{/if}
{#if saveError}
    <p class="text-xs text-red-600 mb-2">{saveError}</p>
{/if}

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
                {#each safeArray(assist) as v}
                    <td class="border text-right">{formatMonth(v)}</td>
                {/each}
            </tr>

            <tr class="section-header">
                <td class="border">Kalendermånad</td>
                {#each safeArray(calendar) as v}
                    <td class="border text-right">{formatMonth(v)}</td>
                {/each}
            </tr>

            <tr class="income-header section-header">
                <td class="border" colspan={1 + months.length}>Inkomster</td>
            </tr>

            {#each incomeRows.filter(isRowVisible) as label}
                <tr class="bg-green-50">
                    <td class="border">{label}</td>
                    {#each safeArray(getRow(label)) as v}
                        <td class="border text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <tr class="bg-green-50">
                <td class="border font-semibold">Korrigering</td>
                {#each months as m, i}
                    <td class="border text-right">
                        <input type="number" step="1" value={incomeCorrection[i]} on:input={(e) => onCorrectionInput("income", m, i, e)} />
                    </td>
                {/each}
            </tr>

            <tr class="income-header font-semibold">
                <td class="border">Summa inkomst</td>
                {#each safeArray(sumIncome) as v}
                    <td class="border text-right">{v} kr</td>
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
                    {#each safeArray(getRow(label)) as v}
                        <td class="border text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Arbete</td>
            </tr>

            {#each workRows.filter(isRowVisible) as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each safeArray(getRow(label)) as v}
                        <td class="border text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Samhäll</td>
            </tr>

            {#each societyRows.filter(isRowVisible) as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each safeArray(getRow(label)) as v}
                        <td class="border text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Samhäll (vård)</td>
            </tr>

            {#each healthRows.filter(isRowVisible) as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each safeArray(getRow(label)) as v}
                        <td class="border text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Riksnorm</td>
            </tr>

            {#each riksnormRows as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each safeArray(getRow(label)) as v}
                        <td class="border text-right">{v} kr</td>
                    {/each}
                </tr>
            {/each}

            <tr class="bg-red-50">
                <td class="border font-semibold">Korrigering</td>
                {#each months as m, i}
                    <td class="border text-right">
                        <input type="number" step="1" value={expenseCorrection[i]} on:input={(e) => onCorrectionInput("expense", m, i, e)} />
                    </td>
                {/each}
            </tr>

            <tr class="expense-header font-semibold">
                <td class="border">Summa utgifter</td>
                {#each safeArray(sumExpenses) as v}
                    <td class="border text-right">{v} kr</td>
                {/each}
            </tr>

            <tr class="balance-row">
                <td class="border">Balans</td>
                {#each safeArray(balance) as v}
                    <td class="border text-right">{v} kr</td>
                {/each}
            </tr>
        </tbody>
    </table>
</div>
