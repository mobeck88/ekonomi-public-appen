<script>
    export let data;

    let selectedYear = data.year;

    const changeYear = (event) => {
        const year = event.target.value;
        window.location.href = `/skatt?year=${year}`;
    };

    // Rätt nycklar enligt nya loadern
    const rows = [
        { key: "årsinkomstHittills", label: "Årsinkomst hittills" },
        { key: "årsprognos", label: "Förväntad årsinkomst (prognos)" },
        { key: "rightTaxOrd", label: "Rätt skatt ord arbete" },
        { key: "rightTaxAssist", label: "Rätt skatt Assistans" },
        { key: "rightTaxFK", label: "Rätt skatt FK" },
        { key: "rightTaxTotal", label: "Total rätt skatt månad" },
        { key: "kommunalSkattÅr", label: "Kommunalskatt (år)" },
        { key: "statligSkatt", label: "Statlig skatt" },
        { key: "totalSkattBorde", label: "Total skatt borde vara" },
        { key: "expectedPaidTax", label: "Förväntad inbetald årsskatt" },
        { key: "diff", label: "Plus/Minus" }
    ];
</script>

<h1>Skatt {data.year}</h1>

<div style="margin-bottom: 20px;">
    <label for="year">Välj år:</label>
    <select id="year" bind:value={selectedYear} on:change={changeYear}>
        {#each Array.from({ length: 6 }, (_, i) => data.currentYear - 3 + i) as y}
            <option value={y}>{y}</option>
        {/each}
    </select>
</div>

<table border="1" cellpadding="8" style="border-collapse: collapse; min-width: 600px;">
    <thead>
        <tr>
            <th>Typ av värde</th>
            {#each data.people as person}
                <th>{person.name}</th>
            {/each}
        </tr>
    </thead>

    <tbody>
        {#each rows as row}
            <tr>
                <td><strong>{row.label}</strong></td>

                {#each data.people as person}
                    <td>
                        {#if person.summary && person.summary[row.key] != null}
                            {#if row.key === "diff"}
                                <span style="color: {person.summary[row.key] >= 0 ? 'green' : 'red'};">
                                    {person.summary[row.key].toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr
                                </span>
                            {:else}
                                {person.summary[row.key].toLocaleString("sv-SE", { maximumFractionDigits: 0 })} kr
                            {/if}
                        {:else}
                            -
                        {/if}
                    </td>
                {/each}
            </tr>
        {/each}
    </tbody>
</table>
