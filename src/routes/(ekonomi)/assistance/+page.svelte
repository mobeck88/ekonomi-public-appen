<script>
    export let data;
    import "./assistance.css";
    import { invalidateAll } from '$app/navigation';

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

    function overskott(i) {
        if (i === 0) return 0;
        const prev = sumDiff(i - 1);
        return prev > 0 ? prev : 0;
    }

    // 🔥 FIXEN: extraPerMonth är nu med i summeringen
    function sumIn(i) {
        return (
            (data.incomeTotal?.[i] ?? 0) +
            (data.correctionIncome?.[i] ?? 0) +
            (data.extraPerMonth?.[i] ?? 0) +   // ← Enda ändringen
            overskott(i)
        );
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

    function monthLabel(ym) {
        const d = new Date(ym + '-01');
        return d.toLocaleString('sv-SE', { month: 'short' });
    }

    function bistandsmanad(ym) {
        const d = new Date(ym + '-01');
        d.setMonth(d.getMonth() + 1);
        return d.toLocaleString('sv-SE', { month: 'short' });
    }

    let isSaving = false;
    let saveStatus = '';
    let saveError = '';
    let saveTimeout;

    async function doSave(i, field, value) {
        const ym = data.months[i];
        const [year, month] = ym.split('-').map(Number);

        isSaving = true;
        saveStatus = 'Sparar...';
        saveError = '';

        try {
            const res = await fetch('/api/update-assistance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    year,
                    month,
                    field,
                    value
                })
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Okänt fel vid sparning');
            }

            await invalidateAll();
            location.reload();

        } catch (err) {
            console.error(err);
            saveError = 'Kunde inte spara ändringen';
        } finally {
            isSaving = false;
        }
    }

    function updateCorrection(i, field, value) {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            doSave(i, field, value);
        }, 300);
    }
</script>

<h1>Budget</h1>

<div class="status-row">
    {#if isSaving}
        <span class="status saving">Sparar...</span>
    {:else if saveStatus}
        <span class="status saved">{saveStatus}</span>
    {/if}
    {#if saveError}
        <span class="status error">{saveError}</span>
    {/if}
</div>

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

            <tr class="sum">
                <td>Biståndsmånad</td>
                {#each data.months as m}
                    <td>{bistandsmanad(m)}</td>
                {/each}
            </tr>

            <tr><td colspan={1 + data.months.length} class="section income-section">INKOMSTER</td></tr>

            {#each members as member}
                <tr class="income-person">
                    <td>Inkomst {member.name}</td>
                    {#each data.months as _, i}
                        <td>{formatKr(data.incomePerUser?.[member.name]?.[i] ?? 0)}</td>
                    {/each}
                </tr>
            {/each}

            <tr>
                <td>Korrigering inkomst</td>
                {#each data.months as _, i}
                    <td>
                        <input
                            type="number"
                            class="correction-input"
                            value={data.correctionIncome[i]}
                            on:change={(e) => updateCorrection(i, 'correction_income', Number(e.target.value))}
                            disabled={isSaving}
                        />
                    </td>
                {/each}
            </tr>

            <tr class="sum income-total">
                <td>Totalt inkomster</td>
                {#each data.months as _, i}
                    <td>{formatKr(sumIn(i))}</td>
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

            <tr><td colspan={1 + data.months.length} class="subsection">Riksnorm</td></tr>

            {#each ['Vuxen', 'Barn', 'Gemensam'] as rowName}
                <tr>
                    <td>{rowName}</td>
                    {#each data.months as _, i}
                        <td>{formatKr(data.riksnorm?.[rowName]?.[i] ?? 0)}</td>
                    {/each}
                </tr>
            {/each}

            <tr>
                <td>Korrigering utgift</td>
                {#each data.months as _, i}
                    <td>
                        <input
                            type="number"
                            class="correction-input"
                            value={data.correctionExpense[i]}
                            on:change={(e) => updateCorrection(i, 'correction_expense', Number(e.target.value))}
                            disabled={isSaving}
                        />
                    </td>
                {/each}
            </tr>

            <tr class="sum">
                <td>Totala utgifter</td>
                {#each data.months as _, i}
                    <td>{formatKr(sumOut(i))}</td>
                {/each}
            </tr>

            <tr><td colspan={1 + data.months.length} class="section">ÖVRIGT</td></tr>

            {#each otherSections as oc}
                <tr>
                    <td>{oc.title}</td>
                    {#each data.months as _, i}
                        <td>{formatKr(data[oc.key][i])}</td>
                    {/each}
                </tr>
            {/each}

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

        </tbody>
    </table>
</div>
