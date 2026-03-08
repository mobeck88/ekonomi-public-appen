<script>
    export let data;

    // Vald månad (default: senaste)
    let selected = data.incomes?.[0];

    // Formläge: add eller update
    let mode = "add";

    // Formfält
    let formData = {
        id: null,
        month: "",
        ord_lon_fore_skatt: "",
        ord_franvaro: "",
        ord_skatt: "",
        ord_nettolon: "",
        ass_lon_fore_skatt: "",
        ass_skatt: "",
        ass_frivillig_skatt: "",
        ass_nettolon: "",
        fk_lon_fore_skatt: "",
        fk_skatt: "",
        fk_nettolon: ""
    };

    function selectMonth(inc) {
        selected = inc;
    }

    function editMonth(inc) {
        mode = "update";
        formData = { ...inc };
        selected = inc;
        showForm = true;
    }

    // Beräkningar
    let ordBrutto = 0;
    let assBrutto = 0;
    let fkBrutto = 0;

    let totalBrutto = 0;
    let totalOrdSkatt = 0;
    let totalAssSkatt = 0;
    let totalFrivilligSkatt = 0;
    let totalFKSkatt = 0;
    let totalSkatt = 0;
    let totalNetto = 0;

    $: if (selected) {
        ordBrutto = Number(selected.ord_lon_fore_skatt ?? 0) - Number(selected.ord_franvaro ?? 0);
        assBrutto = Number(selected.ass_lon_fore_skatt ?? 0);
        fkBrutto = Number(selected.fk_lon_fore_skatt ?? 0);

        totalBrutto =
            Number(selected.ord_lon_fore_skatt ?? 0) +
            Number(selected.ass_lon_fore_skatt ?? 0) +
            Number(selected.fk_lon_fore_skatt ?? 0);

        totalOrdSkatt = Number(selected.ord_skatt ?? 0);
        totalAssSkatt = Number(selected.ass_skatt ?? 0);
        totalFrivilligSkatt = Number(selected.ass_frivillig_skatt ?? 0);
        totalFKSkatt = Number(selected.fk_skatt ?? 0);

        totalSkatt = totalOrdSkatt + totalAssSkatt + totalFrivilligSkatt + totalFKSkatt;

        totalNetto =
            Number(selected.ord_nettolon ?? 0) +
            Number(selected.ass_nettolon ?? 0) +
            Number(selected.fk_nettolon ?? 0);
    }

    // Accordion states
    let showList = true;
    let showForm = false;
    let showSummary = false;
</script>

<h1>Inkomster per månad</h1>

<!-- ⭐ Sektion: Registrerade månader -->
<div class="section">
    <button class="section-header" on:click={() => showList = !showList}>
        <span>Registrerade månader</span>
        <span>{showList ? "▲" : "▼"}</span>
    </button>

    {#if showList}
        <table class="month-list">
            <thead>
                <tr>
                    <th>Månad</th>
                    <th>Ord netto</th>
                    <th>Ass netto</th>
                    <th>FK netto</th>
                    <th>Total netto</th>
                    <th></th>
                </tr>
            </thead>

            <tbody>
                {#each data.incomes as inc}
                    <tr class:selected={selected?.id === inc.id}>
                        <td on:click={() => selectMonth(inc)}>{inc.month}</td>
                        <td>{inc.ord_nettolon ?? 0} kr</td>
                        <td>{inc.ass_nettolon ?? 0} kr</td>
                        <td>{inc.fk_nettolon ?? 0} kr</td>
                        <td>
                            {(Number(inc.ord_nettolon ?? 0)
                            + Number(inc.ass_nettolon ?? 0)
                            + Number(inc.fk_nettolon ?? 0))} kr
                        </td>
                        <td>
                            <button type="button" class="small" on:click={() => editMonth(inc)}>Redigera</button>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}
</div>

<!-- ⭐ Sektion: Formulär -->
<div class="section">
    <button class="section-header" on:click={() => showForm = !showForm}>
        <span>{mode === "add" ? "Ny månad" : "Redigera månad"}</span>
        <span>{showForm ? "▲" : "▼"}</span>
    </button>

    {#if showForm}
        <form method="POST" action="?/{mode}" class="form">

            {#if mode === "update"}
                <input type="hidden" name="id" value={formData.id} />
            {/if}

            <label>
                Månad
                <input type="month" name="month" bind:value={formData.month} required />
            </label>

            <fieldset>
                <legend>Ordinarie arbete</legend>

                <input type="number" name="ord_lon_fore_skatt" bind:value={formData.ord_lon_fore_skatt} placeholder="Lön före skatt" />
                <input type="number" name="ord_franvaro" bind:value={formData.ord_franvaro} placeholder="Frånvaro" />
                <input type="number" name="ord_skatt" bind:value={formData.ord_skatt} placeholder="Skatt" />
                <input type="number" name="ord_nettolon" bind:value={formData.ord_nettolon} placeholder="Nettolön" />
            </fieldset>

            <fieldset>
                <legend>Assistans</legend>

                <input type="number" name="ass_lon_fore_skatt" bind:value={formData.ass_lon_fore_skatt} placeholder="Lön före skatt" />
                <input type="number" name="ass_skatt" bind:value={formData.ass_skatt} placeholder="Skatt" />
                <input type="number" name="ass_frivillig_skatt" bind:value={formData.ass_frivillig_skatt} placeholder="Frivillig skatt" />
                <input type="number" name="ass_nettolon" bind:value={formData.ass_nettolon} placeholder="Nettolön" />
            </fieldset>

            <fieldset>
                <legend>F‑kassan</legend>

                <input type="number" name="fk_lon_fore_skatt" bind:value={formData.fk_lon_fore_skatt} placeholder="Lön före skatt" />
                <input type="number" name="fk_skatt" bind:value={formData.fk_skatt} placeholder="Skatt" />
                <input type="number" name="fk_nettolon" bind:value={formData.fk_nettolon} placeholder="Nettolön" />
            </fieldset>

            <button type="submit">{mode === "add" ? "Spara" : "Uppdatera"}</button>
        </form>
    {/if}
</div>

<!-- ⭐ Sektion: Sammanställning -->
{#if selected}
<div class="section">
    <button class="section-header" on:click={() => showSummary = !showSummary}>
        <span>Sammanställning för {selected.month}</span>
        <span>{showSummary ? "▲" : "▼"}</span>
    </button>

    {#if showSummary}
        <table class="summary">
            <thead>
                <tr>
                    <th>Kategori</th>
                    <th>Belopp</th>
                </tr>
            </thead>

            <tbody>
                <tr><td colspan="2"><strong>Ordinarie arbete</strong></td></tr>
                <tr><td>Lön före skatt</td><td>{selected.ord_lon_fore_skatt} kr</td></tr>
                <tr><td>Frånvaro</td><td>{selected.ord_franvaro} kr</td></tr>
                <tr><td>Bruttolön</td><td>{ordBrutto} kr</td></tr>
                <tr><td>Skatt</td><td>{totalOrdSkatt} kr</td></tr>

                <tr><td colspan="2"><strong>Assistans</strong></td></tr>
                <tr><td>Lön före skatt</td><td>{selected.ass_lon_fore_skatt} kr</td></tr>
                <tr><td>Skatt</td><td>{totalAssSkatt} kr</td></tr>
                <tr><td>Frivillig skatt</td><td>{totalFrivilligSkatt} kr</td></tr>

                <tr><td colspan="2"><strong>F‑kassan</strong></td></tr>
                <tr><td>Lön före skatt</td><td>{selected.fk_lon_fore_skatt} kr</td></tr>
                <tr><td>Skatt</td><td>{totalFKSkatt} kr</td></tr>

                <tr><td colspan="2"><strong>Totaler</strong></td></tr>
                <tr><td>Total bruttolön</td><td>{totalBrutto} kr</td></tr>
                <tr><td>Total skatt</td><td>{totalSkatt} kr</td></tr>
                <tr><td>Total nettolön</td><td>{totalNetto} kr</td></tr>
            </tbody>
        </table>
    {/if}
</div>
{/if}

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    /* Sektioner */
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

    /* Tabeller */
    table {
        width: 100%;
        border-collapse: collapse;
    }

    th, td {
        padding: 0.7rem;
        border-bottom: 1px solid #e5e7eb;
        text-align: left;
        font-size: 0.95rem;
    }

    .month-list tr.selected {
        background: #dbeafe;
        font-weight: 600;
    }

    .small {
        padding: 0.4rem 0.7rem;
        font-size: 0.8rem;
    }

    /* Formulär */
    .form {
        display: grid;
        gap: 1rem;
        padding: 1rem;
        max-width: 600px;
    }

    fieldset {
        border: 1px solid #e5e7eb;
        padding: 1rem;
        border-radius: 8px;
        background: #f9fafb;
    }

    legend {
        font-weight: 600;
        color: #374151;
    }

    input {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #ffffff;
    }

    input:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px #dbeafe;
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

    /* Sammanställning */
    .summary {
        margin-top: 1rem;
        width: 100%;
        border-collapse: collapse;
    }

    .summary td, .summary th {
        border: 1px solid #e5e7eb;
        padding: 0.7rem;
    }

    .summary th {
        background: #f3f4f6;
        font-weight: 600;
    }
</style>
