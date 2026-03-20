<script lang="ts">
    export let data;

    // Faktiska månader från servern
    const months = data.months;

    // Beräkna biståndsmånad (en månad framåt)
    function getNextMonth(year: number, month: number) {
        const d = new Date(year, month - 1, 1);
        d.setMonth(d.getMonth() + 1);
        return {
            year: d.getFullYear(),
            month: d.getMonth() + 1
        };
    }

    // För varje faktisk månad skapar vi en biståndsmånad
    const assistanceMonths = months.map((m) => {
        const next = getNextMonth(m.year, m.month);
        return {
            actual: m,
            assistance: {
                year: next.year,
                month: next.month
            }
        };
    });
</script>

<h1 class="text-2xl font-bold mb-6">Bistånd</h1>

<div class="space-y-10">
    {#each assistanceMonths as row}
        <!-- ========================= -->
        <!-- FAKTISK MÅNAD -->
        <!-- ========================= -->
        <div class="border rounded p-4 bg-gray-50">
            <h2 class="text-xl font-semibold mb-2">
                {row.actual.year}-{String(row.actual.month).padStart(2, '0')} (Faktisk månad)
            </h2>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="font-medium">Inkomster:</p>
                    <p>{row.actual.total_income} kr</p>
                </div>

                <div>
                    <p class="font-medium">Utgifter:</p>
                    <p>{row.actual.total_expenses} kr</p>
                </div>

                <div>
                    <p class="font-medium">Differens:</p>
                    <p class={row.actual.total_income - row.actual.total_expenses < 0 ? 'text-red-600' : 'text-green-600'}>
                        {row.actual.total_income - row.actual.total_expenses} kr
                    </p>
                </div>
            </div>
        </div>

        <!-- ========================= -->
        <!-- BISTÅNDSMÅNAD (UI-BERÄKNAD) -->
        <!-- ========================= -->
        <form method="post" action="?/save" class="border rounded p-4 bg-white">
            <h2 class="text-xl font-semibold mb-2">
                {row.assistance.year}-{String(row.assistance.month).padStart(2, '0')} (Biståndsmånad)
            </h2>

            <input type="hidden" name="id" value={row.actual.id} />

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="font-medium">Korrigering inkomst</label>
                    <input
                        type="number"
                        name="correction_income"
                        value={row.actual.correction_income}
                        class="input"
                    />
                </div>

                <div>
                    <label class="font-medium">Korrigering utgift</label>
                    <input
                        type="number"
                        name="correction_expense"
                        value={row.actual.correction_expense}
                        class="input"
                    />
                </div>

                <div>
                    <label class="font-medium">Soc beslut (saldo)</label>
                    <input
                        type="number"
                        name="soc_decision_balance"
                        value={row.actual.soc_decision_balance}
                        class="input"
                    />
                </div>

                <div class="col-span-2">
                    <label class="font-medium">Soc anteckningar</label>
                    <textarea
                        name="soc_decision_notes"
                        class="textarea"
                    >{row.actual.soc_decision_notes}</textarea>
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
