<script>
    export let data;

    let year = data.selectedYear;

    const years = Array.from({ length: 2100 - 2010 + 1 }, (_, i) => (2010 + i).toString());
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

    // Dynamiska barnkategorier
    const childCategories = Object.keys(data.kidsPerMonth).map(name => `MånadsPeng ${name}`);

    // Dynamiska fasta kostnader + expenses
    const fixedGroups = data.fixedGroups;

    // Dynamiska abonnemang (owner)
    const subscriptionCategories = [
        'Tjänster o abonnemang A',
        'Tjänster o abonnemang H'
    ];

    // Dynamiska sparande (owner)
    const savingCategories = [
        'Sparande A',
        'Sparande H'
    ];

    // Dynamiska fickpengar (owner)
    const allowanceCategories = [
        'Fickpengar Andreas',
        'Fickpengar Hanna'
    ];

    // Alla kategorier i rätt ordning
    const categories = [
        'Gemensam inkomst',
        'Lån',
        'El',
        ...fixedGroups,
        ...subscriptionCategories,
        ...savingCategories,
        ...allowanceCategories,
        ...childCategories,
        'Oförutsägbara utgifter',
        'Extra inkomster'
    ];

    function formatKr(v) {
        const num = Number(v ?? 0);
        return `${num.toLocaleString('sv-SE')} kr`;
    }

    function getAmount(category, index) {
        // Inkomster
        if (category === 'Gemensam inkomst') return data.incomePerMonth[index];

        // Lån
        if (category === 'Lån') return data.loansPerMonth[index];

        // El
        if (category === 'El') return data.electricityPerMonth[index];

        // Abonnemang
        if (category === 'Tjänster o abonnemang A') return data.subs[index].A ?? 0;
        if (category === 'Tjänster o abonnemang H') return data.subs[index].H ?? 0;

        // Sparande
        if (category === 'Sparande A') return data.savings[index].A ?? 0;
        if (category === 'Sparande H') return data.savings[index].H ?? 0;

        // Fickpengar
        if (category === 'Fickpengar Andreas') return data.allowanceUser[index].A ?? 0;
        if (category === 'Fickpengar Hanna') return data.allowanceUser[index].H ?? 0;

        // Barn
        if (category.startsWith('MånadsPeng ')) {
            const name = category.replace('MånadsPeng ', '');
            return data.kidsPerMonth[name][index] ?? 0;
        }

        // Oförutsägbara
        if (category === 'Oförutsägbara utgifter') return data.unexpectedPerMonth[index];

        // Extra inkomster
        if (category === 'Extra inkomster') return data.extraPerMonth[index];

        // Fasta kostnader / expenses
        if (data.fixedPerGroup[category]) return data.fixedPerGroup[category][index];

        return 0;
    }

    function sumIn(i) {
        return data.incomePerMonth[i] + data.extraPerMonth[i];
    }

    function sumOut(i) {
        return categories
            .filter((c) => c !== 'Gemensam inkomst' && c !== 'Extra inkomster')
            .reduce((a, c) => a + getAmount(c, i), 0);
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
            {#each categories as cat}
                <tr
                    data-cat={cat}
                    class:fixed={data.fixedNames.includes(cat)}
                    class:hanna={data.ownerMap[cat] === 'H'}
                    class:andreas={data.ownerMap[cat] === 'A'}
                    class:joint={data.ownerMap[cat] === 'shared'}
                    class:annual={data.intervalMap[cat] === 12}
                    class:quarterly={data.intervalMap[cat] === 3}
                >
                    <td>{cat}</td>
                    {#each data.months as _, i}
                        <td>{formatKr(getAmount(cat, i))}</td>
                    {/each}
                </tr>
            {/each}

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
    .table-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
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

    thead th {
        background: #f5f5f5;
    }

    th:first-child, td:first-child {
        text-align: left;
        font-weight: bold;
    }

    tr.fixed td { background: #fff2cc; }
    tr.hanna td { background: #ffe0e6; }
    tr.andreas td { background: #e0ecff; }
    tr.joint td { background: #f4f4f4; }

    tr[data-cat='Gemensam inkomst'] td { background: #d9ead3; }
    tr[data-cat='Lån'] td { background: #f4cccc; }
    tr[data-cat='El'] td { background: #cfe2f3; }

    tr[data-cat^='Tjänster o abonnemang'] td { background: #c9daf8; }
    tr[data-cat^='Sparande'] td { background: #fff2cc; }
    tr[data-cat^='Fickpengar'] td { background: #ead1dc; }
    tr[data-cat^='MånadsPeng'] td { background: #d9d2e9; }

    tr[data-cat='Oförutsägbara utgifter'] td { background: #fce5cd; }
    tr[data-cat='Extra inkomster'] td { background: #d9ead3; }

    tr.annual td { border-left: 4px solid #8b5cf6; }
    tr.quarterly td { border-left: 4px solid #10b981; }

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
