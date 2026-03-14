<script>
    export let data;

    let selected = null;
    let extraJobs = [];

    let showList = false;
    let showForm = false;

    function newIncome() {
        selected = null;
        extraJobs = [];
        showForm = true;
    }

    function editIncome(m) {
        selected = structuredClone(m);
        showForm = true;

        extraJobs = m.extra_jobs
            ? m.extra_jobs.map(e => ({
                arbetsgivare: e.arbetsgivare_namn ?? "",
                lon_fore_skatt: e.lon_fore_skatt ?? "",
                franvaro: e.franvaro ?? "",
                inbetald_skatt: e.inbetald_skatt ?? "",
                frivillig_skatt: e.frivillig_skatt ?? "",
                att_betala_ut: e.att_betala_ut ?? ""
            }))
            : [];
    }

    function addExtraJob() {
        extraJobs = [
            ...extraJobs,
            {
                arbetsgivare: "",
                lon_fore_skatt: "",
                franvaro: "",
                inbetald_skatt: "",
                frivillig_skatt: "",
                att_betala_ut: ""
            }
        ];
    }

    function removeExtraJob(i) {
        extraJobs = extraJobs.filter((_, idx) => idx !== i);
    }

    function toMonthInput(dateString) {
        if (!dateString) return "";
        return dateString.slice(0, 7);
    }

    // ⭐ Dynamiskt antal extra-jobb kolumner
    const maxExtraJobs = Math.max(...data.months.map(m => m.extra_jobs.length));
    const hasFK = data.months.some(m => m.fk);
</script>

<h1>Inkomster</h1>

<!-- ⭐ Sektion: Lista månader -->
<div class="section">
    <button class="section-header" on:click={() => showList = !showList}>
        <span>Sparade månader</span>
        <span>{showList ? "▲" : "▼"}</span>
    </button>

    {#if showList}
        {#if data.months.length === 0}
            <p class="empty">Inga inkomster registrerade ännu.</p>
        {:else}
            <table class="month-list">
                <thead>
                    <tr>
                        <th>Månad</th>
                        <th>Ordinarie netto</th>

                        {#each Array(maxExtraJobs) as _, i}
                            <th>Extra {i + 1} netto</th>
                        {/each}

                        {#if hasFK}
                            <th>FK netto</th>
                        {/if}

                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    {#each data.months as m}
                        <tr on:click={() => editIncome(m)}>
                            <td>{toMonthInput(m.month)}</td>

                            <!-- Ordinarie netto -->
                            <td>{m.primary_netto} kr</td>

                            <!-- Extra-jobb netto -->
                            {#each Array(maxExtraJobs) as _, i}
                                <td>
                                    {#if m.extra_jobs[i]}
                                        {Number(m.extra_jobs[i].att_betala_ut ?? 0)} kr
                                    {:else}
                                        0 kr
                                    {/if}
                                </td>
                            {/each}

                            <!-- FK netto -->
                            {#if hasFK}
                                <td>{m.fk?.att_betala_ut ? Number(m.fk.att_betala_ut) : 0} kr</td>
                            {/if}

                            <!-- Total -->
                            <td>{m.total} kr</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    {/if}
</div>


<!-- ⭐ Sektion: Ny / Redigera inkomst -->
<div class="section">
    <button class="section-header" on:click={() => showForm = !showForm}>
        <span>{selected ? "Redigera inkomst" : "Ny inkomst"}</span>
        <span>{showForm ? "▲" : "▼"}</span>
    </button>

    {#if showForm}
        <form
            method="POST"
            action={selected ? "?/update_income" : "?/create_income"}
            class="create-form"
        >
            {#if selected}
                <input type="hidden" name="income_month_id" value={selected.id} />
            {/if}

            <!-- Månad -->
            <label>Månad</label>
            <input
                type="month"
                name="month"
                required
                value={selected ? toMonthInput(selected.month) : ""}
            />

            <!-- ⭐ Ordinarie arbete -->
            <h3>Ordinarie arbete</h3>

            <label>Lön före skatt</label>
            <input type="number" step="0.01" name="primary_lon_fore_skatt"
                value={selected?.primary_job?.lon_fore_skatt ?? ""} />

            <label>Frånvaro</label>
            <input type="number" step="0.01" name="primary_franvaro"
                value={selected?.primary_job?.franvaro ?? ""} />

            <label>Inbetald skatt</label>
            <input type="number" step="0.01" name="primary_inbetald_skatt"
                value={selected?.primary_job?.inbetald_skatt ?? ""} />

            <label>Frivillig skatt</label>
            <input type="number" step="0.01" name="primary_frivillig_skatt"
                value={selected?.primary_job?.frivillig_skatt ?? ""} />

            <label>Att betala ut</label>
            <input type="number" step="0.01" name="primary_att_betala_ut"
                value={selected?.primary_job?.att_betala_ut ?? ""} />

            <!-- ⭐ Extra arbeten -->
            <h3>Extra arbeten</h3>

            {#each extraJobs as job, i}
                <div class="card">
                    <label>Arbetsgivare</label>
                    <input type="text" name="extra_arbetsgivare" bind:value={job.arbetsgivare} />

                    <label>Lön före skatt</label>
                    <input type="number" step="0.01" name="extra_lon_fore_skatt" bind:value={job.lon_fore_skatt} />

                    <label>Frånvaro</label>
                    <input type="number" step="0.01" name="extra_franvaro" bind:value={job.franvaro} />

                    <label>Inbetald skatt</label>
                    <input type="number" step="0.01" name="extra_inbetald_skatt" bind:value={job.inbetald_skatt} />

                    <label>Frivillig skatt</label>
                    <input type="number" step="0.01" name="extra_frivillig_skatt" bind:value={job.frivillig_skatt} />

                    <label>Att betala ut</label>
                    <input type="number" step="0.01" name="extra_att_betala_ut" bind:value={job.att_betala_ut} />

                    <button type="button" class="danger" on:click={() => removeExtraJob(i)}>Ta bort</button>
                </div>
            {/each}

            <button type="button" on:click={addExtraJob}>Lägg till extra arbete</button>

            <!-- ⭐ Försäkringskassan -->
            <h3>Försäkringskassan</h3>

            <label>Ersättning före skatt</label>
            <input type="number" step="0.01" name="fk_ersattning_fore_skatt"
                value={selected?.fk?.ersattning_fore_skatt ?? ""} />

            <label>Inbetald skatt</label>
            <input type="number" step="0.01" name="fk_inbetald_skatt"
                value={selected?.fk?.inbetald_skatt ?? ""} />

            <label>Att betala ut</label>
            <input type="number" step="0.01" name="fk_att_betala_ut"
                value={selected?.fk?.att_betala_ut ?? ""} />

            <!-- ⭐ Spara -->
            <button type="submit">
                {selected ? "Spara ändringar" : "Spara inkomst"}
            </button>
        </form>
    {/if}
</div>

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    .section {
        margin-bottom: 1.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .section-header {
        width: 100%;
        background: #f3f4f6;
        border: none;
        padding: 1rem 1.2rem;
        font-size: 1.05rem;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        cursor: pointer;
        color: #111827;
    }

    .section-header:hover {
        background: #e5e7eb;
    }

    .empty {
        padding: 1rem;
        color: #6b7280;
    }

    .create-form {
        display: grid;
        gap: 0.9rem;
        padding: 1rem;
        max-width: 420px;
    }

    input, select {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    input:focus, select:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px #dbeafe;
        background: #ffffff;
    }

    button {
        padding: 0.75rem 1rem;
        border: none;
        background: #2563eb;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        transition: background 0.15s;
    }

    button:hover {
        background: #1d4ed8;
    }

    button.danger {
        background: #dc2626;
    }

    button.danger:hover {
        background: #b91c1c;
    }

    .card {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1rem;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        display: grid;
        gap: 0.8rem;
        margin-bottom: 1rem;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    td, th {
        padding: 0.75rem;
        border-bottom: 1px solid #e5e7eb;
        font-size: 0.95rem;
    }

    tr:hover {
        background: #f3f4f6;
        cursor: pointer;
    }
</style>
