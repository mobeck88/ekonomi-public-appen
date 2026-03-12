<script>
    export let data;

    // Vald månad
    let selected = data.months?.[0] ?? null;

    function toMonthInput(dateString) {
        if (!dateString) return "";
        return dateString.slice(0, 7);
    }

    function selectMonth(m) {
        selected = m;
    }

    // Redigeringsläge för extra jobb
    let editingExtraId = null;
</script>

<h1>Inkomster per månad</h1>

<!-- ⭐ Lista månader -->
<div class="section">
    <button class="section-header" on:click={() => showList = !showList}>
        <span>Registrerade månader</span>
        <span>{showList ? "▲" : "▼"}</span>
    </button>

    {#if showList}
        {#if data.months.length === 0}
            <p style="padding: 1rem;">Inga månader registrerade ännu.</p>
        {:else}
            <table class="month-list">
                <thead>
                    <tr>
                        <th>Månad</th>
                        <th>Ordinarie</th>
                        <th>Extra jobb</th>
                        <th>FK</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {#each data.months as m}
                        <tr class:selected={selected?.id === m.id} on:click={() => selectMonth(m)}>
                            <td>{toMonthInput(m.month)}</td>
                            <td>
                                {m.primary_job
                                    ? Number(m.primary_job.att_betala_ut ?? 0)
                                    : 0} kr
                            </td>
                            <td>
                                {(m.extra_jobs ?? []).reduce(
                                    (sum, e) => sum + Number(e.att_betala_ut ?? 0),
                                    0
                                )} kr
                            </td>
                            <td>
                                {m.fk
                                    ? Number(m.fk.att_betala_ut ?? 0)
                                    : 0} kr
                            </td>
                            <td>
                                {(
                                    (m.primary_job?.att_betala_ut ?? 0) +
                                    (m.fk?.att_betala_ut ?? 0) +
                                    (m.extra_jobs ?? []).reduce(
                                        (sum, e) => sum + Number(e.att_betala_ut ?? 0),
                                        0
                                    )
                                )} kr
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    {/if}
</div>

<!-- ⭐ Skapa månad -->
<div class="section">
    <button class="section-header" on:click={() => showCreate = !showCreate}>
        <span>Ny månad</span>
        <span>{showCreate ? "▲" : "▼"}</span>
    </button>

    {#if showCreate}
        <form method="POST" action="?/create_month" class="form">
            <label>
                Månad
                <input type="month" name="month" required />
            </label>
            <button type="submit">Skapa månad</button>
        </form>
    {/if}
</div>

{#if selected}
<!-- ⭐ Ordinarie arbete -->
<div class="section">
    <button class="section-header" on:click={() => showPrimary = !showPrimary}>
        <span>Ordinarie arbete – {toMonthInput(selected.month)}</span>
        <span>{showPrimary ? "▲" : "▼"}</span>
    </button>

    {#if showPrimary}
        <form method="POST" action="?/save_primary_job" class="form">
            <input type="hidden" name="income_month_id" value={selected.id} />

            <label>Lön före skatt
                <input type="number" name="lon_fore_skatt" step="0.01"
                    value={selected.primary_job?.lon_fore_skatt ?? ""} />
            </label>

            <label>Frånvaro
                <input type="number" name="franvaro" step="0.01"
                    value={selected.primary_job?.franvaro ?? ""} />
            </label>

            <label>Inbetald skatt
                <input type="number" name="inbetald_skatt" step="0.01"
                    value={selected.primary_job?.inbetald_skatt ?? ""} />
            </label>

            <label>Frivillig skatt
                <input type="number" name="frivillig_skatt" step="0.01"
                    value={selected.primary_job?.frivillig_skatt ?? ""} />
            </label>

            <label>Att betala ut
                <input type="number" name="att_betala_ut" step="0.01"
                    value={selected.primary_job?.att_betala_ut ?? ""} />
            </label>

            <button type="submit">Spara ordinarie arbete</button>
        </form>
    {/if}
</div>

<!-- ⭐ Extra arbeten -->
<div class="section">
    <button class="section-header" on:click={() => showExtra = !showExtra}>
        <span>Extra arbeten – {toMonthInput(selected.month)}</span>
        <span>{showExtra ? "▲" : "▼"}</span>
    </button>

    {#if showExtra}
        <!-- Lista extra jobb -->
        {#each selected.extra_jobs as job}
            <div class="extra-item">
                {#if editingExtraId === job.id}
                    <!-- Redigera extra jobb -->
                    <form method="POST" action="?/update_extra_job" class="form">
                        <input type="hidden" name="id" value={job.id} />

                        <label>Arbetsgivare
                            <input type="text" name="arbetsgivare" value={job.arbetsgivare} />
                        </label>

                        <label>Lön före skatt
                            <input type="number" name="lon_fore_skatt" step="0.01"
                                value={job.lon_fore_skatt ?? ""} />
                        </label>

                        <label>Frånvaro
                            <input type="number" name="franvaro" step="0.01"
                                value={job.franvaro ?? ""} />
                        </label>

                        <label>Inbetald skatt
                            <input type="number" name="inbetald_skatt" step="0.01"
                                value={job.inbetald_skatt ?? ""} />
                        </label>

                        <label>Frivillig skatt
                            <input type="number" name="frivillig_skatt" step="0.01"
                                value={job.frivillig_skatt ?? ""} />
                        </label>

                        <label>Att betala ut
                            <input type="number" name="att_betala_ut" step="0.01"
                                value={job.att_betala_ut ?? ""} />
                        </label>

                        <button type="submit">Spara</button>
                        <button type="button" on:click={() => editingExtraId = null}>Avbryt</button>
                    </form>

                    <!-- Ta bort -->
                    <form method="POST" action="?/delete_extra_job">
                        <input type="hidden" name="id" value={job.id} />
                        <button type="submit" class="danger">Ta bort</button>
                    </form>

                {:else}
                    <!-- Visa extra jobb -->
                    <div class="extra-display">
                        <strong>{job.arbetsgivare}</strong> – {job.att_betala_ut} kr
                        <button on:click={() => editingExtraId = job.id}>Redigera</button>
                    </div>
                {/if}
            </div>
        {/each}

        <!-- Lägg till nytt extra jobb -->
        <form method="POST" action="?/add_extra_job" class="form">
            <input type="hidden" name="income_month_id" value={selected.id} />

            <label>Arbetsgivare
                <input type="text" name="arbetsgivare" required />
            </label>

            <label>Lön före skatt
                <input type="number" name="lon_fore_skatt" step="0.01" />
            </label>

            <label>Frånvaro
                <input type="number" name="franvaro" step="0.01" />
            </label>

            <label>Inbetald skatt
                <input type="number" name="inbetald_skatt" step="0.01" />
            </label>

            <label>Frivillig skatt
                <input type="number" name="frivillig_skatt" step="0.01" />
            </label>

            <label>Att betala ut
                <input type="number" name="att_betala_ut" step="0.01" />
            </label>

            <button type="submit">Lägg till extra jobb</button>
        </form>
    {/if}
</div>

<!-- ⭐ Försäkringskassan -->
<div class="section">
    <button class="section-header" on:click={() => showFK = !showFK}>
        <span>Försäkringskassan – {toMonthInput(selected.month)}</span>
        <span>{showFK ? "▲" : "▼"}</span>
    </button>

    {#if showFK}
        <form method="POST" action="?/save_fk" class="form">
            <input type="hidden" name="income_month_id" value={selected.id} />

            <label>Ersättning före skatt
                <input type="number" name="ersattning_fore_skatt" step="0.01"
                    value={selected.fk?.ersattning_fore_skatt ?? ""} />
            </label>

            <label>Inbetald skatt
                <input type="number" name="inbetald_skatt" step="0.01"
                    value={selected.fk?.inbetald_skatt ?? ""} />
            </label>

            <label>Att betala ut
                <input type="number" name="att_betala_ut" step="0.01"
                    value={selected.fk?.att_betala_ut ?? ""} />
            </label>

            <button type="submit">Spara FK</button>
        </form>
    {/if}
</div>
{/if}

<style>
    h1 { margin-bottom: 1.2rem; font-size: 1.6rem; font-weight: 700; }

    .section {
        margin-bottom: 1.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: white;
    }

    .section-header {
        width: 100%;
        padding: 1rem;
        background: #f3f4f6;
        border: none;
        display: flex;
        justify-content: space-between;
        cursor: pointer;
        font-weight: 600;
    }

    .form {
        display: grid;
        gap: 0.8rem;
        padding: 1rem;
    }

    label { display: grid; gap: 0.3rem; }

    input {
        padding: 0.6rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
    }

    button {
        padding: 0.7rem 1rem;
        border: none;
        background: #2563eb;
        color: white;
        border-radius: 6px;
        cursor: pointer;
    }

    .danger {
        background: #dc2626;
        margin-top: 0.5rem;
    }

    .extra-item {
        padding: 0.8rem;
        border-bottom: 1px solid #e5e7eb;
    }

    .extra-display {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
</style>
