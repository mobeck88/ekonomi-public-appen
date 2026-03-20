<script lang="ts">
    export let data;

    // Servern skickar redan färdiga rader:
    // {
    //   month_date,
    //   primary_netto,
    //   extra_netto,
    //   a_kassa,
    //   foraldrapenning,
    //   vab,
    //   sjukpenning,
    //   bostadsbidrag,
    //   underhallsstod,
    //   etableringsersattning,
    //   ovrigt,
    //   total_netto,
    //   total_expenses,
    //   correction_income,
    //   correction_expense,
    //   soc_decision_balance,
    //   soc_decision_notes,
    //   id
    // }

    const rows = data.rows;

    function formatMonth(dateStr: string) {
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function nextMonth(dateStr: string) {
        const d = new Date(dateStr);
        d.setMonth(d.getMonth() + 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
</script>

<h1 class="text-2xl font-bold mb-6">Bistånd</h1>

<div class="space-y-10">
    {#each rows as row}
        <!-- ====================================================== -->
        <!-- FAKTISK MÅNAD (inkomster + utgifter) -->
        <!-- ====================================================== -->
        <div class="border rounded p-4 bg-gray-50">
            <h2 class="text-xl font-semibold mb-4">
                {formatMonth(row.month_date)} (Faktisk månad)
            </h2>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="font-medium">Inkomster totalt</p>
                    <p>{row.total_netto} kr</p>
                </div>

                <div>
                    <p class="font-medium">Utgifter totalt</p>
                    <p>{row.total_expenses ?? 0} kr</p>
                </div>

                <div>
                    <p class="font-medium">Differens</p>
                    <p class={row.total_netto - (row.total_expenses ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}>
                        {row.total_netto - (row.total_expenses ?? 0)} kr
                    </p>
                </div>
            </div>

            <!-- Detaljerad inkomsttabell -->
            <div class="mt-6">
                <h3 class="font-semibold mb-2">Inkomster (detaljer)</h3>
                <table class="w-full text-sm border">
                    <thead class="bg-gray-200">
                        <tr>
                            <th class="p-2 border">Typ</th>
                            <th class="p-2 border">Belopp</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr><td class="p-2 border">Lön (primary)</td><td class="p-2 border">{row.primary_netto} kr</td></tr>
                        <tr><td class="p-2 border">Extra jobb</td><td class="p-2 border">{row.extra_netto} kr</td></tr>
                        <tr><td class="p-2 border">A‑kassa</td><td class="p-2 border">{row.a_kassa} kr</td></tr>
                        <tr><td class="p-2 border">Föräldrapenning</td><td class="p-2 border">{row.foraldrapenning} kr</td></tr>
                        <tr><td class="p-2 border">VAB</td><td class="p-2 border">{row.vab} kr</td></tr>
                        <tr><td class="p-2 border">Sjukpenning</td><td class="p-2 border">{row.sjukpenning} kr</td></tr>
                        <tr><td class="p-2 border">Bostadsbidrag</td><td class="p-2 border">{row.bostadsbidrag} kr</td></tr>
                        <tr><td class="p-2 border">Underhållsstöd</td><td class="p-2 border">{row.underhallsstod} kr</td></tr>
                        <tr><td class="p-2 border">Etableringsersättning</td><td class="p-2 border">{row.etableringsersattning} kr</td></tr>
                        <tr><td class="p-2 border">Övrigt</td><td class="p-2 border">{row.ovrigt} kr</td></tr>
                        <tr class="font-semibold bg-gray-100">
                            <td class="p-2 border">Summa</td>
                            <td class="p-2 border">{row.total_netto} kr</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ====================================================== -->
        <!-- BISTÅNDSMÅNAD (en månad framåt) -->
        <!-- ====================================================== -->
        <form method="post" action="?/save" class="border rounded p-4 bg-white">
            <h2 class="text-xl font-semibold mb-4">
                {nextMonth(row.month_date)} (Biståndsmånad)
            </h2>

            <input type="hidden" name="id" value={row.id} />

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="font-medium">Korrigering inkomst</label>
                    <input
                        type="number"
                        name="correction_income"
                        value={row.correction_income ?? 0}
                        class="input"
                    />
                </div>

                <div>
                    <label class="font-medium">Korrigering utgift</label>
                    <input
                        type="number"
                        name="correction_expense"
                        value={row.correction_expense ?? 0}
                        class="input"
                    />
                </div>

                <div>
                    <label class="font-medium">Soc beslut (saldo)</label>
                    <input
                        type="number"
                        name="soc_decision_balance"
                        value={row.soc_decision_balance ?? 0}
                        class="input"
                    />
                </div>

                <div class="col-span-2">
                    <label class="font-medium">Soc anteckningar</label>
                    <textarea
                        name="soc_decision_notes"
                        class="textarea"
                    >{row.soc_decision_notes ?? ''}</textarea>
                </div>

                <div class="col-span-2">
                    <button class="btn-primary">Spara</button>
                </div>
            </div>
        </form>
    {/each}
</div>

<style>
    .input {
        @apply w-full border rounded px-2 py-1;
    }
    .textarea {
        @apply w-full border rounded px-2 py-1 h-24;
    }
    .btn-primary {
        @apply bg-blue-600 text-white px-4 py-2 rounded;
    }
</style>
