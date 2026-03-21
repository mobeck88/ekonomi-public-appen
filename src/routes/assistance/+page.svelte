<style>
    /* Sticky header */
    thead th {
        position: sticky;
        top: 0;
        z-index: 10;
        background: #f3f4f6; /* gray-100 */
    }

    /* Hover rows */
    tbody tr:hover td {
        background-color: #f9fafb; /* gray-50 */
    }

    /* Excel-like cell spacing */
    td, th {
        padding: 10px 12px;
        font-size: 0.9rem;
    }

    /* Section headers */
    .section-header {
        background: #e5e7eb; /* gray-200 */
        font-weight: 700;
        font-size: 1rem;
    }

    .income-header {
        background: #bbf7d0; /* green-200 */
    }

    .income-subheader {
        background: #d1fae5; /* green-100 */
    }

    .expense-header {
        background: #fecaca; /* red-200 */
    }

    .expense-subheader {
        background: #fee2e2; /* red-100 */
    }

    .balance-row {
        background: #e5e7eb; /* gray-200 */
        font-weight: 600;
    }

    table {
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }
</style>

<h1 class="text-2xl font-bold mb-6">Bistånd</h1>

<div class="overflow-x-auto">
    <table class="min-w-full text-sm border-collapse">

        <!-- HEADER -->
        <thead>
            <tr>
                <th class="border text-left">Kategori</th>
                {#each months as m}
                    <th class="border text-right">{m}</th>
                {/each}
            </tr>
        </thead>

        <tbody>

            <!-- BISTÅNDSMÅNAD -->
            <tr class="section-header">
                <td class="border">Biståndsmånad</td>
                {#each assist.values as v}
                    <td class="border text-right">{v}</td>
                {/each}
            </tr>

            <!-- KALENDERMÅNAD -->
            <tr class="section-header">
                <td class="border">Kalendermånad</td>
                {#each calendar.values as v}
                    <td class="border text-right">{v}</td>
                {/each}
            </tr>

            <!-- INKOMSTER -->
            <tr class="income-header section-header">
                <td class="border" colspan={1 + months.length}>Inkomster</td>
            </tr>

            {#each incomeRows as label}
                <tr class="bg-green-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <!-- ÖVRIGA INKOMSTER -->
            <tr class="income-subheader section-header">
                <td class="border" colspan={1 + months.length}>Övriga inkomster</td>
            </tr>

            {#each otherIncomeRows as label}
                <tr class="bg-green-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <!-- SUMMA INKOMST -->
            <tr class="income-header font-semibold">
                <td class="border">Summa inkomst</td>
                {#each sumIncome.values as v}
                    <td class="border text-right">{v}</td>
                {/each}
            </tr>

            <!-- UTGIFTER -->
            <tr class="expense-header section-header">
                <td class="border" colspan={1 + months.length}>Utgifter</td>
            </tr>

            <!-- HEM -->
            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Hem</td>
            </tr>

            {#each homeRows as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <!-- ARBETE -->
            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Arbete</td>
            </tr>

            {#each workRows as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <!-- SAMHÄLL -->
            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Samhäll</td>
            </tr>

            {#each societyRows as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <!-- SAMHÄLL (VÅRD) -->
            <tr class="expense-subheader section-header">
                <td class="border" colspan={1 + months.length}>Samhäll (vård)</td>
            </tr>

            {#each healthRows as label}
                <tr class="bg-red-50">
                    <td class="border">{label}</td>
                    {#each getRow(label).values as v}
                        <td class="border text-right">{v}</td>
                    {/each}
                </tr>
            {/each}

            <!-- SUMMA UTGIFTER -->
            <tr class="expense-header font-semibold">
                <td class="border">Summa utgifter</td>
                {#each sumExpenses.values as v}
                    <td class="border text-right">{v}</td>
                {/each}
            </tr>

            <!-- BALANS -->
            <tr class="balance-row">
                <td class="border">Balans</td>
                {#each balance.values as v}
                    <td class="border text-right">{v}</td>
                {/each}
            </tr>

        </tbody>
    </table>
</div>
