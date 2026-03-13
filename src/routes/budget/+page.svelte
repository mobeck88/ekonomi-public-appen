<script>
    export let data;

    let year = data.selectedYear;

    const years = Array.from({ length: 2100 - 2010 + 1 }, (_, i) => (2010 + i).toString());
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

    // 🔥 Dynamiska användare
    const members = data.members.map(m => m.name);

    // 🔥 INKOMSTER – en rad per användare + gemensam
    const incomeCategories = [
        ...members.map(name => `Inkomst ${name}`),
        'Gemensam inkomst'
    ];

    // 🔥 UTGIFTER – dynamiska grupper
    const expenseGroups = [
        { title: 'Lån', key: 'loansPerMonth' },
        { title: 'El', key: 'electricityPerMonth' },
        { title: 'Fasta kostnader', key: 'fixedPerGroup', dynamic: true },
        { title: 'Abonnemang', key: 'subs', dynamic: true },
        { title: 'Sparande', key: 'savings', dynamic: true },
        { title: 'Fickpengar', key: 'allowanceUser', dynamic: true },
        { title: 'Barn', key: 'kidsPerMonth', dynamic: true }
    ];

    // 🔥 ÖVRIGT
    const otherCategories = [
        { title: 'Oförutsägbara utgifter', key: 'unexpectedPerMonth' },
        { title: 'Extra inkomster', key: 'extraPerMonth' }
    ];

    function formatKr(v) {
        const num = Number(v ?? 0);
        return `${num.toLocaleString('sv-SE')} kr`;
    }

    function getIncomeAmount(category, index) {
        if (category === 'Gemensam inkomst') return data.incomePerMonth[index];

        const name = category.replace('Inkomst ', '');
        const user = data.members.find(m => m.name === name);
        if (!user) return 0;

        return data.incomePerMonth[index] * 0.5; // placeholder tills vi bygger individuell inkomst
    }

    function getDynamicAmount(groupKey, category, index) {
        const group = data[groupKey];

        if (!group) return 0;

        // Fasta kostnader
        if (groupKey === 'fixedPerGroup') {
            return group[category]?.[index] ?? 0;
        }

        // Abonnemang / Sparande / Fickpengar
        if (groupKey === 'subs' || groupKey === 'savings' || groupKey === 'allowanceUser') {
            return group[index]?.[category] ?? 0;
        }

        // Barn
        if (groupKey === 'kidsPerMonth') {
            return group[category]?.[index] ?? 0;
        }

        return 0;
    }

    function sumIn(i) {
        return data.incomePerMonth[i] + data.extraPerMonth[i];
    }

    function sumOut(i) {
        let total = 0;

        // Fasta kostnader
        for (const name of data.fixedGroups) {
            total += data.fixedPerGroup[name][i];
        }

        // Abonnemang
        for (const m of members) total += data.subs[i][m] ?? 0;
        total += data.subs[i].shared ?? 0;

        // Sparande
        for (const m of members) total += data.savings[i][m] ?? 0;

        // Fickpengar
        for (const m of members) total += data.allowanceUser[i][m] ?? 0;

        // Barn
        for (const name of Object.keys(data.kidsPerMonth)) {
            total += data.kidsPerMonth[name][i];
        }

        // Lån
        total += data.loansPerMonth[i];

        // El
        total += data.electricityPerMonth[i];

        // Oförutsägbara
        total += data.unexpectedPerMonth[i];

        return total;
    }

    function sumDiff(i) {
        return sumIn(i) - sumOut(i);
    }

    let startingBuffer = 0;

    $: bufferValues = (() => {
        let buffer = startingBuffer;
        const result = [];
        for (let i = 0; i < data.months.length; i++) {
            buffer += sumDiff(i);
            result.push(buffer);
        }
        return result;
    })();
</script>

<h1>Budget {year}</h1>

<form method="GET">
    <select name="year" bind:value={year} on:change={() => event.target.form.submit()}>
        {#each years as y}
            <option value={y}>{y}</option>
        {/each}
    </select>
</form>

<div class="table-wrapper">
    <table>
        <thead>
            <tr>
                <th>Kategori</th>
                {#each monthLabels as ml}
                    <th>{ml}</th>
                {/each}
            </tr>
        </thead>

        <tbody>

            <!-- 🔥 INKOMSTER -->
            <tr><td colspan="13" class="section">INKOMSTER</td></tr>

            {#each incomeCategories as cat}
                <tr>
                    <td>{cat}</td>
                    {#each data.months as _, i}
                        <td>{formatKr(getIncomeAmount(cat, i))}</td>
                    {/each}
                </tr>
            {/each}

            <!-- 🔥 UTGIFTER -->
            <tr><td colspan="13" class="section">UTGIFTER</td></tr>

            {#each expenseGroups as group}
                <tr><td colspan="13" class="subsection">{group.title}</td></tr>

                {#if group.dynamic}
                    {#each Object.keys(data[group.key]) as cat}
                        <tr>
                            <td>{cat}</td>
                            {#each data.months as _, i}
                                <td>{formatKr(getDynamicAmount(group.key, cat, i))}</td>
                            {/each}
                        </tr>
                    {/each}
                {:else}
                    <tr>
                        <td>{group.title}</td>
                        {#each data.months as _, i}
                            <td>{formatKr(data[group.key][i])}</td>
                        {/each}
                    </tr>
                {/if}
            {/each}

            <!-- 🔥 ÖVRIGT -->
            <tr><td colspan="13" class="section">ÖVRIGT</td></tr>

            {#each otherCategories as oc}
                <tr>
                    <td>{oc.title}</td>
                    {#each data.months as _, i}
                        <td>{formatKr(data[oc.key][i])}</td>
                    {/each}
                </tr>
            {/each}

            <!-- 🔥 SUMMERING -->
            <tr><td colspan="13" class="section">SUMMERING</td></tr>

            <tr class="sum">
                <td>In</td>
                {#each data.months as _, i}
                    <td>{formatKr(sumIn(i))}</td>
                {/each}
            </tr>

            <tr class="sum">
                <td>Ut</td>
                {#each data.months as _, i}
                    <td>{formatKr(sumOut(i))}</td>
                {/each}
            </tr>

            <tr class="sum diff">
                <td>Diff</td>
                {#each data.months as _, i}
                    <td>{formatKr(sumDiff(i))}</td>
                {/each}
            </tr>

            <tr class="sum buffer">
                <td>Buffert</td>
                {#each bufferValues as b}
                    <td>{formatKr(b)}</td>
                {/each}
            </tr>

        </tbody>
    </table>
</div>

<style>
    .section {
        background: #333;
        color: white;
        font-weight: bold;
        text-align: left;
        padding: 0.5rem;
    }

    .subsection {
        background: #ddd;
        font-weight: bold;
        text-align: left;
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

    tr.diff td {
        background: #d0ffd0 !important;
    }

    tr.buffer td {
        background: #c9e7ff !important;
    }
</style>
