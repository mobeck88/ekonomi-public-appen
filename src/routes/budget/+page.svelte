<script>
    export let data;

    let year = data.selectedYear;

    const years = Array.from({ length: 2100 - 2010 + 1 }, (_, i) => (2010 + i).toString());
    const monthLabels = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];

    // 🔥 Dynamiska användare
    const members = data.members;

    // 🔥 Färgpalett (ingen grön)
    const userColorClasses = [
        'andreas',  // blå
        'hanna',    // rosa
        'purple',   // lila
        'orange',   // orange
        'yellow',   // gul
        'teal',     // turkos
        'red'       // röd
    ];

    function colorClassForUser(userId) {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = (hash * 31 + userId.charCodeAt(i)) % 100000;
        }
        return userColorClasses[hash % userColorClasses.length];
    }

    // 🔥 UTGIFTER – dynamiska sektioner
    const expenseSections = [
        { title: 'Lån', key: 'loansPerMonth', type: 'simple' },
        { title: 'El', key: 'electricityPerMonth', type: 'simple' },
        { title: 'Fasta kostnader', key: 'fixedPerGroup', type: 'fixed' },
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

    function sumIn(i) {
        return data.extraPerMonth[i]; // inkomster hoppar vi över tills vidare
    }

    function sumOut(i) {
        let total = 0;

        // Fasta kostnader
        for (const name of data.fixedGroups) {
            total += data.fixedPerGroup[name][i];
        }

        // Abonnemang
        for (const m of members) total += data.subs[i][m.name] ?? 0;
        total += data.subs[i].shared ?? 0;

        // Sparande
        for (const m of members) total += data.savings[i][m.name] ?? 0;

        // Fickpengar
        for (const m of members) total += data.allowanceUser[i][m.name] ?? 0;

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

            <!-- 🔥 UTGIFTER -->
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
                    {#each Object.keys(data.fixedPerGroup) as name}
                        <tr class="fixed">
                            <td>{name}</td>
                            {#each data.months as _, i}
                                <td>{formatKr(data.fixedPerGroup[name][i])}</td>
                            {/each}
                        </tr>
                    {/each}

                {:else if section.type === 'perUser'}
                    {#each members as member}
                        <tr class={colorClassForUser(member.id)}>
                            <td>{section.title} {member.name}</td>
                            {#each data.months as _, i}
                                <td>{formatKr(data[section.key][i][member.name] ?? 0)}</td>
                            {/each}
                        </tr>
                    {/each}

                    <tr class="joint">
                        <td>{section.title} (delat)</td>
                        {#each data.months as _, i}
                            <td>{formatKr(data[section.key][i].shared ?? 0)}</td>
                        {/each}
                    </tr>

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

            <!-- 🔥 ÖVRIGT -->
            <tr><td colspan="13" class="section">ÖVRIGT</td></tr>

            {#each otherSections as oc}
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

    /* 🔥 DYNAMISKA FÄRGER */
    .andreas { background: #e0ecff; }
    .hanna { background: #ffe0e6; }
    .purple { background: #f0e6ff; }
    .orange { background: #ffe8d1; }
    .yellow { background: #fff9cc; }
    .teal { background: #d9f7f5; }
    .red { background: #ffd6d6; }

    .joint td { background: #f4f4f4; }

    .fixed td { background: #fff2cc; }

    .annual td { border-left: 4px solid #8b5cf6; }
    .quarterly td { border-left: 4px solid #10b981; }

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
