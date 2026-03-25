<script>
    export let data;

    const members = data.members;

    const userColorClasses = [
        'andreas', 'hanna', 'purple', 'orange', 'yellow', 'teal', 'red'
    ];

    function colorClassForUser(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = (hash * 31 + userId.charCodeAt(i)) % 100000;
        }
        return userColorClasses[hash % userColorClasses.length];
    }

    const expenseSections = [
        { title: 'El', key: 'electricityPerMonth', type: 'simple' },
        { title: 'Fasta kostnader Bistånd', key: 'riksnormPerGroup', type: 'fixed' }
    ];

    const otherSections = [
        { title: 'Extra inkomster', key: 'extraPerMonth' }
    ];

    function formatKr(v) {
        const num = Number(v ?? 0);
        return `${num.toLocaleString('sv-SE')} kr`;
    }

    function sumIn(i) {
        return (data.incomeTotal?.[i] ?? 0) + (data.correctionIncome?.[i] ?? 0);
    }

    function sumOut(i) {
        let total = 0;

        for (const name of Object.keys(data.riksnormPerGroup ?? {})) {
            total += data.riksnormPerGroup[name][i];
        }

        total += (data.riksnorm?.Vuxen?.[i] ?? 0);
        total += (data.riksnorm?.Barn?.[i] ?? 0);
        total += (data.riksnorm?.Gemensam?.[i] ?? 0);

        total += data.electricityPerMonth[i] ?? 0;

        total += (data.correctionExpense?.[i] ?? 0);

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

    function monthLabel(ym) {
        const d = new Date(ym + '-01');
        return d.toLocaleString('sv-SE', { month: 'short' });
    }

    async function updateCorrection(i, field, value) {
        const ym = data.months[i];
        const [year, month] = ym.split('-').map(Number);

        await fetch('/api/update-assistance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                year,
                month,
                field,
                value
            })
        });
    }
</script>

<h1>Budget</h1>

<div class="table-wrapper">
    <table>
        <thead>
            <tr>
                <th>Kategori</th>
                {#each data.months as m}
                    <th>{monthLabel(m)}</th>
                {/each}
            </tr>
        </thead>

        <tbody>
            <!-- INKOMSTER -->
            <tr><td colspan={1 + data.months.length} class="section income-section">INKOMSTER</td></tr>

            {#each members as member}
                <tr class="income-person">
                    <td>Inkomst {member.name}</td>
                    {#each data.months as _, i}
                        <td>{formatKr(data.incomePerUser?.[member.name]?.[i] ?? 0)}</td>
                    {/each}
                </tr>
            {/each}

            <tr class="sum income-total">
                <td>Totalt hushåll</td>
                {#each data.months as _, i}
                    <td>{formatKr(data.incomeTotal?.[i] ?? 0)}</td>
                {/each}
            </tr>

            <!-- ⭐ KORRIGERING INKOMST -->
            <tr>
                <td>Korrigering inkomst</td>
                {#each data.months as _, i}
                    <td>
                        <input
                            type="number"
                            value={data.correctionIncome[i]}
                            on:change={(e) => updateCorrection(i, 'correction_income', Number(e.target.value))}
                        />
                    </td>
                {/each}
            </tr>

            <tr><td colspan={1 + data.months.length} class="section">UTGIFTER</td></tr>

            {#each expenseSections as section}
                <tr><td colspan={1 + data.months.length} class="subsection">{section.title}</td></tr>

                {#if section.type === 'simple'}
                    <tr>
                        <td>{section.title}</td>
                        {#each data.months as _, i}
                            <td>{formatKr(data[section.key][i])}</td>
                        {/each}
                    </tr>

                {:else if section.type === 'fixed'}
                    {#each Object.keys(data[section.key] ?? {}) as name}
                        <tr class="fixed">
                            <td>{name}</td>
                            {#each data.months as _, i}
                                <td>{formatKr(data[section.key][name][i] ?? 0)}</td>
                            {/each}
                        </tr>
                    {/each}
                {/if}
            {/each}

            <!-- ⭐ KORRIGERING UTGIFT -->
            <tr>
                <td>Korrigering utgift</td>
                {#each data.months as _, i}
                    <td>
                        <input
                            type="number"
                            value={data.correctionExpense[i]}
                            on:change={(e) => updateCorrection(i, 'correction_expense', Number(e.target.value))}
                        />
                    </td>
                {/each}
            </tr>

            <!-- RIKSNORM -->
            <tr><td colspan={1 + data.months.length} class="subsection">Riksnorm</td></tr>

            {#each ['Vuxen', 'Barn', 'Gemensam'] as rowName}
                <tr>
                    <td>{rowName}</td>
                    {#each data.months as _, i}
                        <td>{formatKr(data.riksnorm?.[rowName]?.[i] ?? 0)}</td>
                    {/each}
                </tr>
            {/each}

            <!-- ÖVRIGT -->
            <tr><td colspan={1 + data.months.length} class="section">ÖVRIGT</td></tr>

            {#each otherSections as oc}
                <tr>
                    <td>{oc.title}</td>
                    {#each data.months as _, i}
                        <td>{formatKr(data[oc.key][i])}</td>
                    {/each}
                </tr>
            {/each}

            <!-- SUMMERING -->
            <tr><td colspan={1 + data.months.length} class="section">SUMMERING</td></tr>

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
        background: #e8eef7;
        color: #111827;
        font-weight: bold;
        text-align: left;
        padding: 0.5rem;
    }

    .income-section {
        background: #d9fbe0;
    }

    .subsection {
        background: #f3f6fb;
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

    .andreas { background: #e0ecff; }
    .hanna { background: #ffe0e6; }
    .purple { background: #f0e6ff; }
    .orange { background: #ffe8d1; }
    .yellow { background: #fff9cc; }
    .teal { background: #d9f7f5; }
    .red { background: #ffd6d6; }

    .joint td { background: #f4f4f4; }
    .fixed td { background: #fff2cc; }

    tr.sum td {
        background: #e0e0e0 !important;
        font-weight: bold;
    }

    tr.sum.income-total td {
        background: #c9f7c9 !important;
    }

    tr.diff td {
        background: #d0ffd0 !important;
    }

    tr.buffer td {
        background: #c9e7ff !important;
    }

    input {
        width: 80px;
        padding: 2px 4px;
        text-align: right;
    }
</style>
