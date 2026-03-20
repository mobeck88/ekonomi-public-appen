<script lang="ts">
    export let data;

    // months = faktiska månader från DB
    const months = data.months;

    // Hjälpfunktion: skapa biståndsmånad (en månad framåt)
    function nextMonth(year: number, month: number) {
        const d = new Date(year, month - 1, 1);
        d.setMonth(d.getMonth() + 1);
        return {
            year: d.getFullYear(),
            month: d.getMonth() + 1
        };
    }
</script>

<h1 class="text-2xl font-bold mb-6">Bistånd</h1>

<div class="space-y-10">
    {#each months as m}
        <!-- Faktisk månad -->
        <div class="border rounded p-4 bg-gray-50">
            <h2 class="text-xl font-semibold mb-2">
                {m.year}-{String(m.month).padStart(2, '0')} (Faktisk månad)
            </h2>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="font-medium">Inkomster:</p>
                    <p>{m.total_income} kr</p>
                </div>

                <div>
                    <p class="font-medium">Utgifter:</p>
                    <p>{m.total_expenses} kr</p>
                </div>

                <div>
                    <p class="font-medium">Differens:</p>
                    <p class={m.total_income - m.total_expenses < 0 ? 'text-red-600' : 'text-green-600'}>
                        {m.total_income - m.total_expenses} kr
                    </p>
                </div>
            </div>
        </div>

        <!-- Biståndsmånad -->
        {#key m.id}
            {#let b = nextMonth(m.year, m.month)}
                <form method="post" action="?/save" class="border rounded p-4 bg-white">
                    <h2 class="text-xl font-semibold mb-2">
                        {b.year}-{String(b.month).padStart(2, '0')} (Biståndsmånad)
                    </h2>

                    <input type="hidden" name="id" value={m.id} />

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="font-medium">Korrigering inkomst</label>
                            <input
                                type="number"
                                name="correction_income"
                                value={m.correction_income}
                                class="input"
                            />
                        </div>

                        <div>
                            <label class="font-medium">Korrigering utgift</label>
                            <input
                                type="number"
                                name="correction_expense"
                                value={m.correction_expense}
                                class="input"
                            />
                        </div>

                        <div>
                            <label class="font-medium">Soc beslut (saldo)</label>
                            <input
                                type="number"
                                name="soc_decision_balance"
                                value={m.soc_decision_balance}
                                class="input"
                            />
                        </div>

                        <div class="col-span-2">
                            <label class="font-medium">Soc anteckningar</label>
                            <textarea
                                name="soc_decision_notes"
                                class="textarea"
                            >{m.soc_decision_notes}</textarea>
                        </div>

                        <div class="col-span-2">
                            <button class="btn-primary">Spara</button>
                        </div>
                    </div>
                </form>
            {/let}
        {/key}
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
