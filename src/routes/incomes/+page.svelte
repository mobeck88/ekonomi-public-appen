<script>
    export let data;

    let selected = null;
    let extraJobs = [];
    let fkList = [];

    let showList = false;
    let showForm = false;

    // Vem sidan visar inkomster för just nu (user_id)
    let selectedUserId = data.selectedUserId;
    const currentUserId = data.currentUserId;
    const isOwner = data.isOwner;
    const isGuardian = data.isGuardian;
    const guardianForMemberId = data.guardianForMemberId;
    const members = data.members ?? [];

    const FK_TYPES = [
        'Sjukpenning',
        'Tillfällig föräldrapenning (VAB)',
        'Graviditetspenning',
        'Sjukersättning',
        'Aktivitetsersättning',
        'Aktivitetsstöd',
        'Smittbärarpenning',
        'Närståendepenning',
        'Livränta vid arbetsskada',
        'Etableringsersättning',
        'Utvecklingsersättning',
        'Barnbidrag',
        'Förlängt barnbidrag',
        'Studiebidrag (CSN)',
        'Bostadsbidrag',
        'Bostadstillägg',
        'Underhållsstöd',
        'Övrigt'
    ];

    const FK_BENEFIT_TYPES = [
        'Barnbidrag',
        'Förlängt barnbidrag',
        'Studiebidrag (CSN)',
        'Bostadsbidrag',
        'Bostadstillägg',
        'Underhållsstöd'
    ];

    function isBenefitType(t) {
        return FK_BENEFIT_TYPES.includes(t ?? '');
    }

    function onFkTypeChange(fk) {
        if (isBenefitType(fk.fk_typ)) {
            fk.ersattning_fore_skatt = '';
            fk.inbetald_skatt = '';
        }
    }

    function newIncome() {
        selected = null;
        extraJobs = [];
        fkList = [];
        showForm = true;
    }

    function editIncome(m) {
        selected = structuredClone(m);
        showForm = true;

        extraJobs = m.extra_jobs
            ? m.extra_jobs.map((e) => ({
                    employer_id: e.employer_id ?? '',
                    lon_fore_skatt: e.lon_fore_skatt ?? '',
                    franvaro: e.franvaro ?? '',
                    inbetald_skatt: e.inbetald_skatt ?? '',
                    frivillig_skatt: e.frivillig_skatt ?? '',
                    att_betala_ut: e.att_betala_ut ?? '',
                    isAddingEmployer: false,
                    newEmployerName: ''
              }))
            : [];

        fkList = m.fk_list
            ? m.fk_list.map((f) => ({
                    fk_typ: f.fk_typ ?? '',
                    fk_typ_ovrigt: f.fk_typ_ovrigt ?? '',
                    ersattning_fore_skatt: f.ersattning_fore_skatt ?? '',
                    inbetald_skatt: f.inbetald_skatt ?? '',
                    att_betala_ut: f.att_betala_ut ?? ''
              }))
            : [];
    }

    function addExtraJob() {
        extraJobs = [
            ...extraJobs,
            {
                employer_id: '',
                lon_fore_skatt: '',
                franvaro: '',
                inbetald_skatt: '',
                frivillig_skatt: '',
                att_betala_ut: '',
                isAddingEmployer: false,
                newEmployerName: ''
            }
        ];
    }

    function removeExtraJob(i) {
        extraJobs = extraJobs.filter((_, idx) => idx !== i);
    }

    function addFk() {
        fkList = [
            ...fkList,
            {
                fk_typ: '',
                fk_typ_ovrigt: '',
                ersattning_fore_skatt: '',
                inbetald_skatt: '',
                att_betala_ut: ''
            }
        ];
    }

    function removeFk(i) {
        fkList = fkList.filter((_, idx) => idx !== i);
    }

    function toMonthInput(dateString) {
        if (!dateString) return '';
        return dateString.slice(0, 7);
    }

    function handleEmployerSelect(index, event) {
        const value = event.target.value;
        const job = extraJobs[index];

        if (value === '__new__') {
            job.isAddingEmployer = true;
            job.newEmployerName = '';
            job.employer_id = '';
        } else {
            job.employer_id = value;
            job.isAddingEmployer = false;
            job.newEmployerName = '';
        }

        extraJobs = [...extraJobs];
    }

    async function createEmployerForIndex(index) {
        const job = extraJobs[index];
        const name = job.newEmployerName?.trim();
        if (!name) return;

        const form = new FormData();
        form.append('name', name);

        const res = await fetch('?/create_employer', {
            method: 'POST',
            body: form
        });

        if (res.ok) {
            const emp = await res.json();
            data.employers = [...data.employers, emp];

            job.employer_id = emp.id;
            job.isAddingEmployer = false;
            job.newEmployerName = '';

            extraJobs = [...extraJobs];
        }
    }

    function cancelNewEmployer(index) {
        const job = extraJobs[index];
        job.isAddingEmployer = false;
        job.newEmployerName = '';
        job.employer_id = '';
        extraJobs = [...extraJobs];
    }

    // Medlemmar som ska visas i dropdown
    $: selectableMembers = (() => {
        if (isOwner) return members;
        if (isGuardian && guardianForMemberId)
            return members.filter((m) => m.id === guardianForMemberId);
        return [];
    })();
</script>

<h1>Inkomster</h1>

{#if isOwner || isGuardian}
    <div class="section">
        <div class="member-selector">
            <form method="GET">
                <label for="user_id">Visa inkomster för</label>

                <select
                    id="user_id"
                    name="user_id"
                    bind:value={selectedUserId}
                    on:change={() => event.target.form.submit()}
                >
                    {#each selectableMembers as m}
                        <option value={m.user_id}>
                            {m.profiles.full_name}
                            {m.user_id === currentUserId ? ' (du)' : ''}
                        </option>
                    {/each}
                </select>
            </form>
        </div>
    </div>
{/if}

<!-- ⭐ Lista månader -->
<div class="section">
    <button class="section-header" on:click={() => (showList = !showList)}>
        <span>Sparade månader</span>
        <span>{showList ? '▲' : '▼'}</span>
    </button>

    {#if showList}
        {#if data.months.length === 0}
            <p class="empty">Inga inkomster registrerade ännu.</p>
        {:else}
            <table class="month-list">
                <tbody>
                    {#each data.months as m}
                        <tr on:click={() => editIncome(m)}>
                            <td>{toMonthInput(m.month)}</td>

                            <td>
                                <strong>Ordinarie</strong><br />
                                {m.primary_netto} kr
                            </td>

                            {#each m.extra_jobs as job}
                                <td>
                                    <strong>{job.employer_name}</strong><br />
                                    {Number(job.att_betala_ut ?? 0)} kr
                                </td>
                            {/each}

                            {#each m.fk_list as fk}
                                <td>
                                    <strong>
                                        FK – {fk.fk_typ === 'Övrigt' ? fk.fk_typ_ovrigt : fk.fk_typ}
                                    </strong><br />
                                    {Number(fk.att_betala_ut ?? 0)} kr
                                </td>
                            {/each}

                            <td>
                                <strong>Total</strong><br />
                                {m.total} kr
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    {/if}
</div>
<!-- ⭐ Formulär -->
<div class="section">
    <button class="section-header" on:click={() => (showForm = !showForm)}>
        <span>{selected ? 'Redigera inkomst' : 'Ny inkomst'}</span>
        <span>{showForm ? '▲' : '▼'}</span>
    </button>

    {#if showForm}
        <form
            method="POST"
            action={selected ? '?/update_income' : '?/create_income'}
            class="create-form"
        >
            {#if selected}
                <input type="hidden" name="income_month_id" value={selected.id} />
            {/if}

            <!-- Vem gäller inkomsten för (servern validerar) -->
            <input type="hidden" name="selected_user_id" value={selectedUserId} />

            <!-- Månad -->
            <label>Månad</label>
            <input
                type="month"
                name="month"
                required
                value={selected ? toMonthInput(selected.month) : ''}
            />

            <!-- ⭐ Ordinarie arbete -->
            <h3>Ordinarie arbete</h3>

            <label>Lön före skatt</label>
            <input
                type="number"
                step="0.01"
                name="primary_lon_fore_skatt"
                value={selected?.primary_job?.lon_fore_skatt ?? ''}
            />

            <label>Frånvaro</label>
            <input
                type="number"
                step="0.01"
                name="primary_franvaro"
                value={selected?.primary_job?.franvaro ?? ''}
            />

            <label>Inbetald skatt</label>
            <input
                type="number"
                step="0.01"
                name="primary_inbetald_skatt"
                value={selected?.primary_job?.inbetald_skatt ?? ''}
            />

            <label>Frivillig skatt</label>
            <input
                type="number"
                step="0.01"
                name="primary_frivillig_skatt"
                value={selected?.primary_job?.frivillig_skatt ?? ''}
            />

            <label>Att betala ut</label>
            <input
                type="number"
                step="0.01"
                name="primary_att_betala_ut"
                value={selected?.primary_job?.att_betala_ut ?? ''}
            />

            <!-- ⭐ Extra arbeten -->
            <h3>Extra arbeten</h3>

            {#each extraJobs as job, i}
                <div class="card">
                    <label>Arbetsgivare</label>

                    {#if job.isAddingEmployer}
                        <input
                            type="text"
                            placeholder="Ny arbetsgivare…"
                            bind:value={job.newEmployerName}
                        />
                        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                            <button type="button" on:click={() => createEmployerForIndex(i)}>
                                Spara
                            </button>
                            <button
                                type="button"
                                class="danger"
                                on:click={() => cancelNewEmployer(i)}
                            >
                                Ångra
                            </button>
                        </div>
                    {:else}
                        <select
                            name="extra_employer_id"
                            value={job.employer_id}
                            on:change={(e) => handleEmployerSelect(i, e)}
                        >
                            <option value="">Välj arbetsgivare…</option>
                            {#each data.employers as emp}
                                <option value={emp.id}>{emp.name}</option>
                            {/each}
                            <option value="__new__">Lägg till ny…</option>
                        </select>
                    {/if}

                    <label>Lön före skatt</label>
                    <input
                        type="number"
                        step="0.01"
                        name="extra_lon_fore_skatt"
                        bind:value={job.lon_fore_skatt}
                    />

                    <label>Frånvaro</label>
                    <input
                        type="number"
                        step="0.01"
                        name="extra_franvaro"
                        bind:value={job.franvaro}
                    />

                    <label>Inbetald skatt</label>
                    <input
                        type="number"
                        step="0.01"
                        name="extra_inbetald_skatt"
                        bind:value={job.inbetald_skatt}
                    />

                    <label>Frivillig skatt</label>
                    <input
                        type="number"
                        step="0.01"
                        name="extra_frivillig_skatt"
                        bind:value={job.frivillig_skatt}
                    />

                    <label>Att betala ut</label>
                    <input
                        type="number"
                        step="0.01"
                        name="extra_att_betala_ut"
                        bind:value={job.att_betala_ut}
                    />

                    <button type="button" class="danger" on:click={() => removeExtraJob(i)}>
                        Ta bort
                    </button>
                </div>
            {/each}

            <button type="button" on:click={addExtraJob}>Lägg till extra arbete</button>

            <!-- ⭐ FK -->
            <h3>Försäkringskassan</h3>

            {#each fkList as fk, i}
                <div class="card">
                    <label>Typ av ersättning</label>
                    <select
                        name="fk_typ"
                        bind:value={fk.fk_typ}
                        on:change={() => onFkTypeChange(fk)}
                    >
                        <option value="">Välj typ…</option>
                        {#each FK_TYPES as t}
                            <option value={t}>{t}</option>
                        {/each}
                    </select>

                    {#if fk.fk_typ === 'Övrigt'}
                        <label>Beskrivning</label>
                        <input type="text" name="fk_typ_ovrigt" bind:value={fk.fk_typ_ovrigt} />
                    {/if}

                    {#if !isBenefitType(fk.fk_typ)}
                        <label>Ersättning före skatt</label>
                        <input
                            type="number"
                            step="0.01"
                            name="fk_ersattning_fore_skatt"
                            bind:value={fk.ersattning_fore_skatt}
                        />

                        <label>Inbetald skatt</label>
                        <input
                            type="number"
                            step="0.01"
                            name="fk_inbetald_skatt"
                            bind:value={fk.inbetald_skatt}
                        />
                    {/if}

                    <label>Att betala ut</label>
                    <input
                        type="number"
                        step="0.01"
                        name="fk_att_betala_ut"
                        bind:value={fk.att_betala_ut}
                    />

                    <button type="button" class="danger" on:click={() => removeFk(i)}>
                        Ta bort
                    </button>
                </div>
            {/each}

            <button type="button" on:click={addFk}>Lägg till FK‑ersättning</button>

            <button type="submit">
                {selected ? 'Spara ändringar' : 'Spara inkomst'}
            </button>
        </form>
    {/if}
</div>

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    .section {
        margin-bottom: 1.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .section-header {
        width: 100%;
        background: #f3f4f6;
        border: none;
        padding: 1rem 1.2rem;
        font-size: 1.05rem;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        cursor: pointer;
        color: #111827;
    }

    .section-header:hover {
        background: #e5e7eb;
    }

    .empty {
        padding: 1rem;
        color: #6b7280;
    }

    .create-form {
        display: grid;
        gap: 0.9rem;
        padding: 1rem;
        max-width: 420px;
    }

    input,
    select {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    input:focus,
    select:focus {
        outline: none;
        border-color: #2563eb;
        box-shadow: 0 0 0 2px #dbeafe;
        background: #ffffff;
    }

    button {
        padding: 0.75rem 1rem;
        border: none;
        background: #2563eb;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        transition: background 0.15s;
    }

    button:hover {
        background: #1d4ed8;
    }

    button.danger {
        background: #dc2626;
    }

    button.danger:hover {
        background: #b91c1c;
    }

    .card {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 1rem;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        display: grid;
        gap: 0.8rem;
        margin-bottom: 1rem;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    td,
    th {
        padding: 0.75rem;
        border-bottom: 1px solid #e5e7eb;
        font-size: 0.95rem;
        vertical-align: top;
    }

    tr:hover {
        background: #f3f4f6;
        cursor: pointer;
    }

    .member-selector {
        padding: 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .member-selector form {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
    }
</style>
