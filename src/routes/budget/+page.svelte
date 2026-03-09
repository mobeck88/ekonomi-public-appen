<script>
    export let data;

    let year = data.selectedYear;

    const years = Array.from({ length: 2100 - 2010 + 1 }, (_, i) => (2010 + i).toString());
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

    const categories = [
        'Gemensam inkomst',
        'Lån',
        'El',
        ...data.fixedGroups,
        'Tjänster o abonnemang A',
        'Tjänster o abonnemang H',
        'Sparande A',
        'Sparande H',
        'Fickpengar Andreas',
        'Fickpengar Hanna',
        'MånadsPeng Theo',
        'MånadsPeng Lowe',
        'Oförutsägbara utgifter',
        'Extra inkomster'
    ];

    function formatKr(v) {
        const num = Number(v ?? 0);
        return `${num.toLocaleString('sv-SE')} kr`;
    }

    function getAmount(category, index) {
        switch (category) {
            case 'Gemensam inkomst':
                return data.incomePerMonth[index];

            case 'Lån':
                return data.loansPerMonth[index];

            case 'El':
                return data.electricityPerMonth[index];

            case 'Tjänster o abonnemang A':
                return data.subsA[index];

            case 'Tjänster o abonnemang H':
                return data.subsH[index];

            case 'Sparande A':
                return data.savingsA[index];

            case 'Sparande H':
                return data.savingsH[index];

            case 'Fickpengar Andreas':
                return data.allowanceA[index];

            case 'Fickpengar Hanna':
                return data.allowanceH[index];

            case 'MånadsPeng Theo':
                return data.theo[index];

            case 'MånadsPeng Lowe':
                return data.lowe[index];

            case 'Oförutsägbara utgifter':
                return data.unexpectedPerMonth[index];

            case 'Extra inkomster':
                return data.extraPerMonth[index];

            default:
                if (data.fixedPerGroup[category]) {
                    return data.fixedPerGroup[category][index];
                }
                return 0;
        }
    }

    function sumIn(index) {
        return data.incomePerMonth[index] + data.extraPerMonth[index];
    }

    function sumOut(index) {
        return categories
            .filter((c) => c !== 'Gemensam inkomst' && c !== 'Extra inkomster')
            .reduce((a, c) => a + getAmount(c, index), 0);
    }

    function sumDiff(index) {
        return sumIn(index) - sumOut(index);
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

            <!-- Sektionstitel -->
            <tr class="section">
                <td colspan="13">Utgifter</td>
            </tr>

            {#each categories as cat}
                <tr
                    data-cat={cat}
                    class:data-owner={data.ownerMap[cat]}
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

    th,
    td {
        border: 1px solid #ddd;
        padding: 0.4rem 0.6rem;
        text-align: right;
        white-space: nowrap;
    }

    thead th {
        background: #f5f5f5;
    }

    th:first-child,
    td:first-child {
        text-align: left;
        font-weight: bold;
    }

    /* Sektionstitel */
    tr.section td {
        background: #222;
        color: white;
        font-weight: bold;
        text-transform: uppercase;
        text-align: left;
        font-size: 0.9rem;
    }

    /* Ägare-färgkoder */
    tr[data-owner="H"] td {
        background-color: #ffe0e6 !important;
    }

    tr[data-owner="A"] td {
        background-color: #e0ecff !important;
    }

    tr[data-owner="A+H"] td {
        background-color: #f4f4f4 !important;
    }

    /* Intervallmarkering */
    tr.annual td {
        border-left: 4px solid #8b5cf6;
    }

    tr.quarterly td {
        border-left: 4px solid #10b981;
    }

    /* Summeringsrader */
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
