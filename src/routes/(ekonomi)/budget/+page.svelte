<script>
    export let data;

    let year = data.selectedYear;

    const years = Array.from({ length: 2100 - 2010 + 1 }, (_, i) => (2010 + i).toString());
    const monthLabels = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];

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
        { title: 'Lån', key: 'loansPerMonth', type: 'perUser' },
        { title: 'El', key: 'electricityPerMonth', type: 'simple' },
        { title: 'Fasta kostnader', key: 'fixedPerGroup', type: 'fixed' },
        ...(data.hasEconomicAssistance
            ? [{ title: 'Fasta kostnader Bistånd', key: 'riksnormPerGroup', type: 'fixed' }]
            : []),
        { title: 'Utgifter', key: 'expensesPerGroup', type: 'fixed' }, // ⭐ KORREKT
        { title: 'Abonnemang', key: 'subs', type: 'perUser' },
        { title: 'Sparande', key: 'savings', type: 'perUser' },
        { title: 'Fickpengar', key: 'allowanceUser', type: 'perUser' },
        { title: 'Barn', key: 'kidsPerMonth', type: 'kids' }
    ];

    const otherSections = [
        { title: 'Oförutsägbara utgifter', key: 'unexpectedPerMonth' },
        { title: 'Extra inkomster', key: 'extraPerMonth' }
    ];

    function formatKr(v) {
        const num = Number(v ?? 0);
        return `${num.toLocaleString('sv-SE')} kr`;
    }

    function hasShared(sectionKey) {
        const arr = data[sectionKey];
        if (!arr || !Array.isArray(arr)) return false;
        return arr.some((m) => (m?.shared ?? 0) > 0);
    }

    function sumIn(i) {
        return (
            (data.incomeTotal?.[i] ?? 0) +
            (data.extraPerMonth?.[i] ?? 0) +
            (data.economicAssistancePerMonth?.[i] ?? 0)
        );
    }

    function sumOut(i) {
        let total = 0;

        // Fasta kostnader
        for (const name of Object.keys(data.fixedPerGroup ?? {})) {
            total += data.fixedPerGroup[name][i];
        }

        // Fasta kostnader Bistånd
        for (const name of Object.keys(data.riksnormPerGroup ?? {})) {
            total += data.riksnormPerGroup[name][i];
        }

        // Utgifter
        for (const name of Object.keys(data.expensesPerGroup ?? {})) {
            total += data.expensesPerGroup[name][i];
        }

        for (const m of members) total += data.subs[i][m.name] ?? 0;
        total += data.subs[i].shared ?? 0;

        for (const m of members) total += data.savings[i][m.name] ?? 0;

        for (const m of members) total += data.allowanceUser[i][m.name] ?? 0;

        for (const name of Object.keys(data.kidsPerMonth)) {
            total += data.kidsPerMonth[name][i];
        }

        for (const m of members) total += data.loansPerMonth[i][m.name] ?? 0;
        total += data.loansPerMonth[i].shared ?? 0;

        total += data.electricityPerMonth[i];

        total += (data.unexpectedPerMonth?.[i] ?? 0);

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

    function hasAnyLoanForMember(memberName) {
        return data.months.some((_, i) => (data.loansPerMonth[i][memberName] ?? 0) !== 0);
    }
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
            <!-- INKOMSTER -->
            <tr><td colspan="13" class="section income-section">INKOMSTER</td></tr>

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

            <!-- UTGIFTER -->
            <tr><td colspan="13" class="section">UTGIFTER</td></tr>

            {#each expenseSections as section}
                <tr><td colspan="13" class="subsection">{section.title}</td></tr>

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

                {:else if section.type === 'perUser'}
                    {#each members as member}
                        {#if section.key !== 'loansPerMonth' || hasAnyLoanForMember(member.name)}
                            <tr class={colorClassForUser(member.id)}>
                                <td>{section.title} {member.name}</td>
                                {#each data.months as _, i}
                                    <td>{formatKr(data[section.key][i][member.name] ?? 0)}</td>
                                {/each}
                            </tr>
                        {/if}
                    {/each}

                    {#if hasShared(section.key)}
                        <tr class="joint">
                            <td>{section.title} – gemensamt</td>
                            {#each data.months as _, i}
                                <td>{formatKr(data[section.key][i].shared ?? 0)}</td>
                            {/each}
                        </tr>
                    {/if}

                {:else if section.type === 'kids'}
                    {#each Object.keys(data.kidsPerMonth) as name}
                        <tr class="kids">
                            <td>{name}</td>
                            {#each data.months as _, i}
                                <td>{formatKr(data.kidsPerMonth[name][i])}</td>
                            {/each}
                        </tr>
                    {/each}
                {/if}
            {/each}

            <!-- ÖVRIGT -->
            <tr><td colspan="13" class="section">ÖVRIGT</td></tr>

            {#each otherSections as oc}
                <tr>
                    <td>{oc.title}</td>
                    {#each data.months as _, i}
                        <td>{formatKr(data[oc.key][i])}</td>
                    {/each}
                </tr>
            {/each}

            {#if data.hasEconomicAssistance}
                <tr>
                    <td>Ekonomiskt bistånd</td>
                    {#each data.months as _, i}
                        <td>{formatKr(data.economicAssistancePerMonth[i])}</td>
                    {/each}
                </tr>
            {/if}

            <!-- SUMMERING -->
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
</style>
