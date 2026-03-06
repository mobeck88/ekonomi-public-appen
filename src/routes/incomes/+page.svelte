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

        // KORREKT TOTAL BRUTTOLÖN
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
</script>

<h1>Inkomster per månad</h1>

<form method="POST" action="?/{mode}" style="display:flex; flex-direction:column; gap:1rem; max-width:600px;">

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
        <legend>F-kassan</legend>

        <input type="number" name="fk_lon_fore_skatt" bind:value={formData.fk_lon_fore_skatt} placeholder="Lön före skatt" />
        <input type="number" name="fk_skatt" bind:value={formData.fk_skatt} placeholder="Skatt" />
        <input type="number" name="fk_nettolon" bind:value={formData.fk_nettolon} placeholder="Nettolön" />
    </fieldset>

    <button type="submit">{mode === "add" ? "Spara" : "Uppdatera"}</button>
</form>

<hr />

<h2>Registrerade månader</h2>

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
                    <button type="button" on:click={() => editMonth(inc)}>Redigera</button>
                </td>
            </tr>
        {/each}
    </tbody>
</table>

{#if selected}
    <hr />

    <h2>Sammanställning för {selected.month}</h2>

    <table class="summary">
        <thead>
            <tr>
                <th>Kategori</th>
                <th>Belopp</th>
            </tr>
        </thead>

        <tbody>

            <!-- ORD ARBETE -->
            <tr><td colspan="2"><strong>Ordinarie arbete</strong></td></tr>
            <tr><td>Lön före skatt</td><td>{selected.ord_lon_fore_skatt} kr</td></tr>
            <tr><td>Frånvaro</td><td>{selected.ord_franvaro} kr</td></tr>
            <tr><td>Bruttolön</td><td>{ordBrutto} kr</td></tr>
            <tr><td>Skatt</td><td>{totalOrdSkatt} kr</td></tr>

            <!-- ASSISTANS -->
            <tr><td colspan="2"><strong>Assistans</strong></td></tr>
            <tr><td>Lön före skatt</td><td>{selected.ass_lon_fore_skatt} kr</td></tr>
            <tr><td>Skatt</td><td>{totalAssSkatt} kr</td></tr>
            <tr><td>Frivillig skatt</td><td>{totalFrivilligSkatt} kr</td></tr>

            <!-- F-KASSAN -->
            <tr><td colspan="2"><strong>F‑kassan</strong></td></tr>
            <tr><td>Lön före skatt</td><td>{selected.fk_lon_fore_skatt} kr</td></tr>
            <tr><td>Skatt</td><td>{totalFKSkatt} kr</td></tr>

            <!-- TOTALER -->
            <tr><td colspan="2"><strong>Totaler</strong></td></tr>
            <tr><td>Total bruttolön</td><td>{totalBrutto} kr</td></tr>
            <tr><td>Total skatt</td><td>{totalSkatt} kr</td></tr>
            <tr><td>Total nettolön</td><td>{totalNetto} kr</td></tr>

        </tbody>
    </table>
{/if}

<style>
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.5rem; border-bottom: 1px solid #ddd; text-align: left; }

    .month-list tr.selected {
        background: #d0e7ff;
        font-weight: bold;
    }

    fieldset { border: 1px solid #ccc; padding: 1rem; }
    legend { font-weight: bold; }

    .summary {
        width: 400px;
        border-collapse: collapse;
        margin-top: 2rem;
    }
    .summary td, .summary th {
        border: 1px solid #ccc;
        padding: 6px 10px;
    }
    .summary th {
        background: #eee;
    }
</style>
