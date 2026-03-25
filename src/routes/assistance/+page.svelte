<script lang="ts">
    export let data;

    // Skapa 5 månader: 3 bakåt, nuvarande, 1 framåt
    const today = new Date();
    const months = [];

    for (let offset = -3; offset <= 1; offset++) {
        const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);

        months.push({
            label: d.toLocaleString('sv-SE', { month: 'short', year: 'numeric' }),
            year: d.getFullYear(),
            month: d.getMonth() + 1
        });
    }

    let selectedYear = Number(data.selectedYear);

    function formatKr(v) {
        const num = Number(v ?? 0);
        return `${num.toLocaleString('sv-SE')} kr`;
    }
</script>

<h1>Budget</h1>

<!-- Månadsväljare -->
<select
    name="year"
    on:change={(e) => {
        const selected = months[e.target.selectedIndex];
        const params = new URLSearchParams(window.location.search);
        params.set('year', selected.year.toString());
        window.location.search = params.toString();
    }}
>
    {#each months as m}
        <option value={m.year} selected={m.year === selectedYear}>
            {m.label}
        </option>
    {/each}
</select>

<div class="table-wrapper">
    <table>
        <thead>
            <tr>
                <th>Kategori</th>
                {#each months as m}
                    <th>{m.label}</th>
                {/each}
            </tr>
        </thead>

        <tbody>
            <!-- INKOMSTER (oförändrat) -->
            <tr><td colspan={1 + months.length} class="section income-section">INKOMSTER</td></tr>

            {#each data.members as member}
                <tr class="income-person">
                    <td>Inkomst {member.name}</td>
                    {#each months as _, i}
                        <td>{formatKr(data.incomePerUser?.[member.name]?.[i] ?? 0)}</td>
                    {/each}
                </tr>
            {/each}

            <tr class="sum income-total">
                <td>Totalt hushåll</td>
                {#each months as _, i}
                    <td>{formatKr(data.incomeTotal?.[i] ?? 0)}</td>
                {/each}
            </tr>

            <!-- UTGIFTER -->
            <tr><td colspan={1 + months.length} class="section">UTGIFTER</td></tr>

            <!-- Fasta kostnader Bistånd (ska vara kvar) -->
            <tr><td colspan={1 + months.length} class="subsection">Fasta kostnader Bistånd</td></tr>

            {#each Object.keys(data.riksnormPerGroup ?? {}) as name}
                <tr class="fixed">
                    <td>{name}</td>
                    {#each months as _, i}
                        <td>{formatKr(data.riksnormPerGroup[name][i] ?? 0)}</td>
                    {/each}
                </tr>
            {/each}

            <!-- NY SEKTION: RIKSNORM -->
            <tr><td colspan={1 + months.length} class="subsection">Riksnorm</td></tr>

            {#each data.riksnorm as row}
                <tr>
                    <td>{row.name}</td>
                    {#each months as _, i}
                        <td>{formatKr(row.amount)}</td>
                    {/each}
                </tr>
            {/each}

            <!-- SUMMERING (oförändrat) -->
            <tr><td colspan={1 + months.length} class="section">SUMMERING</td></tr>

            <tr class="sum">
                <td>In</td>
                {#each months as _, i}
                    <td>{formatKr(data.incomeTotal?.[i] ?? 0)}</td>
                {/each}
            </tr>

            <tr class="sum">
                <td>Ut</td>
                {#each months as _, i}
                    <td>{formatKr(
                        (data.riksnormPerGroupTotal?.[i] ?? 0) +
                        (data.riksnormTotal ?? 0)
                    )}</td>
                {/each}
            </tr>
        </tbody>
    </table>
</div>

<style>
    .section {
        background: #e8eef7;
        font-weight: bold;
        padding: 0.5rem;
    }

    .income-section {
        background: #d9fbe0;
    }

    .subsection {
        background: #f3f6fb;
        font-weight: bold;
        padding: 0.4rem;
    }

    .table-wrapper {
        overflow-x: auto;
    }

    table {
        width: max-content;
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    th, td {
        border: 1px solid #ddd;
        padding: 0.4rem 0.6rem;
        text-align: right;
        white-space: nowrap;
    }

    th:first-child, td:first-child {
        text-align: left;
        font-weight: bold;
    }

    tr.sum td {
        background: #e0e0e0 !important;
        font-weight: bold;
    }
</style>
