<script lang="ts">
    export let data: any;

    const access = data.access;

    let selectedCompanyId: string | 'none' | null = null;
    let showKrono = false;

    let modalOpen = false;
    let editing: any = null;
    let confirmDelete = false;

    function toCurrency(n: number | string | null | undefined) {
        const num = Number(n ?? 0);
        return Number.isFinite(num) ? num.toLocaleString('sv-SE') : '0';
    }

    function openCompany(id: string | 'none') {
        selectedCompanyId = id;
        showKrono = false;
        modalOpen = false;
        editing = null;
        confirmDelete = false;
    }

    function openKrono() {
        selectedCompanyId = null;
        showKrono = true;
        modalOpen = false;
        editing = null;
        confirmDelete = false;
    }

    function normalizeDebt(d: any) {
        return {
            ...structuredClone(d),
            original_reference: d.original_reference ?? '',
            collection_reference: d.collection_reference ?? '',
            collection_company_id: d.collection_company_id ?? '',
            amount: d.amount ?? '',
            is_kronofogden: Boolean(d.is_kronofogden),
            isAddingCompany: false,
            newCompanyName: ''
        };
    }

    function openDebt(d: any) {
        if (!access.canEdit) return;
        editing = normalizeDebt(d);
        modalOpen = true;
        confirmDelete = false;
    }

    function closeModal() {
        modalOpen = false;
        editing = null;
        confirmDelete = false;
    }

    async function createCompanyInline(stateObj: any) {
        const name = stateObj.newCompanyName?.trim();
        if (!name) return;

        const form = new FormData();
        form.append('name', name);

        const res = await fetch('?/create_company', { method: 'POST', body: form });

        if (res.ok) {
            const company = await res.json();
            if (!company?.id) return;

            data.companies = [...data.companies, company];
            stateObj.collection_company_id = company.id;
            stateObj.isAddingCompany = false;
            stateObj.newCompanyName = '';
        }
    }

    function cancelNewCompany(stateObj: any) {
        stateObj.isAddingCompany = false;
        stateObj.newCompanyName = '';
        stateObj.collection_company_id = '';
    }

    // ⭐ TOTALSUMMOR
    const totalKrono = data.krono.reduce((s, d) => s + Number(d.amount ?? 0), 0);

    const totalInkasso = Object.entries(data.totals)
        .filter(([key]) => key !== 'none')
        .reduce((s, [, v]) => s + Number(v ?? 0), 0);

    const totalUtanInkasso = Number(data.totals['none'] ?? 0);

    const totalAll = totalKrono + totalInkasso + totalUtanInkasso;
</script>

<h1>Skuldöversikt</h1>

<!-- ⭐ TOTALSUMMOR HÖGST UPP -->
<div class="totals-bar">
    <div>
        <strong>Inkasso:</strong> {toCurrency(totalInkasso)} kr
    </div>
    <div>
        <strong>Utan inkasso:</strong> {toCurrency(totalUtanInkasso)} kr
    </div>
    <div>
        <strong>Kronofogden:</strong> {toCurrency(totalKrono)} kr
    </div>
    <div class="total-all">
        <strong>Totalt:</strong> {toCurrency(totalAll)} kr
    </div>
</div>

<div class="top-actions">
    <a href="/debts" class="new-link">➕ Skapa ny skuld</a>
</div>

<div class="grid">
    {#each data.companies as c}
        <div class="card" on:click={() => openCompany(c.id)}>
            <h2>{c.name}</h2>
            <p class="amount">{toCurrency(data.totals[c.id] ?? 0)} kr</p>
        </div>
    {/each}

    <div class="card" on:click={() => openCompany('none')}>
        <h2>Utan inkasso</h2>
        <p class="amount">{toCurrency(data.totals['none'] ?? 0)} kr</p>
    </div>

    <div class="card danger" on:click={openKrono}>
        <h2>Kronofogden</h2>
        <p class="amount">
            {toCurrency(totalKrono)} kr
        </p>
    </div>
</div>

{#if selectedCompanyId !== null}
    <h2 class="table-title">
        {selectedCompanyId === 'none'
            ? 'Skulder utan inkasso'
            : data.companies.find((c) => c.id === selectedCompanyId)?.name}
    </h2>

    <table>
        <thead>
            <tr>
                <th>Titel</th>
                <th>Grundföretag</th>
                <th>Referens</th>
                <th>Belopp</th>
                <th>Kronofogden</th>
            </tr>
        </thead>
        <tbody>
            {#each data.grouped[selectedCompanyId] ?? [] as d}
                <tr on:click={() => openDebt(d)}>
                    <td>{d.title}</td>
                    <td>{d.original_company_name}</td>
                    <td>{d.original_reference}</td>
                    <td>{toCurrency(d.amount)} kr</td>
                    <td>{d.is_kronofogden ? 'Ja' : 'Nej'}</td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}

{#if showKrono}
    <h2 class="table-title">Skulder hos Kronofogden</h2>

    <table>
        <thead>
            <tr>
                <th>Titel</th>
                <th>Grundföretag</th>
                <th>Referens</th>
                <th>Belopp</th>
                <th>Inkasso</th>
            </tr>
        </thead>
        <tbody>
            {#each data.krono as d}
                <tr on:click={() => openDebt(d)}>
                    <td>{d.title}</td>
                    <td>{d.original_company_name}</td>
                    <td>{d.original_reference}</td>
                    <td>{toCurrency(d.amount)} kr</td>
                    <td>
                        {#if d.collection_company_id}
                            {data.companies.find((c) => c.id === d.collection_company_id)?.name}
                        {:else}
                            —
                        {/if}
                    </td>
                </tr>
            {/each}
        </tbody>
    </table>
{/if}

{#if modalOpen && editing}
    <!-- MODAL KOD OFÖRÄNDRAD -->
    <!-- (jag lämnar den som den är eftersom du inte bad om ändringar där) -->
{/if}

<style>
    .totals-bar {
        display: flex;
        gap: 2rem;
        padding: 1rem;
        background: #f3f4f6;
        border-radius: 10px;
        margin-bottom: 1.5rem;
        font-size: 1.1rem;
    }

    .totals-bar div {
        display: flex;
        flex-direction: column;
    }

    .total-all {
        margin-left: auto;
        font-size: 1.2rem;
        color: #111;
    }

    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    .top-actions {
        display: flex;
        justify-content: flex-end;
        margin-bottom: 1rem;
    }

    .new-link {
        color: #2563eb;
        font-weight: 600;
        text-decoration: none;
    }

    .new-link:hover {
        text-decoration: underline;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .card {
        padding: 1rem;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        cursor: pointer;
        transition: 0.15s;
    }

    .card:hover {
        background: #f3f4f6;
    }

    .card h2 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
    }

    .amount {
        margin-top: 0.5rem;
        font-size: 1.2rem;
        font-weight: 700;
        color: #2563eb;
    }

    .card.danger {
        border-color: #dc2626;
    }

    .card.danger .amount {
        color: #dc2626;
    }

    .table-title {
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        font-size: 1.3rem;
        font-weight: 600;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 1rem;
    }

    th,
    td {
        padding: 0.75rem;
        border-bottom: 1px solid #e5e7eb;
        font-size: 0.95rem;
        vertical-align: top;
    }

    tr:hover {
        background: #f3f4f6;
        cursor: pointer;
    }

    /* Modal */

    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        z-index: 40;
    }

    .modal {
        position: fixed;
        inset: 0;
        margin: auto;
        max-width: 480px;
        max-height: 90vh;
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        padding: 1.25rem 1.5rem;
        z-index: 50;
        overflow-y: auto;
    }

    .modal h2 {
        margin-top: 0;
        margin-bottom: 1rem;
        font-size: 1.3rem;
        font-weight: 600;
    }

    .modal-form {
        display: grid;
        gap: 0.75rem;
    }

    input,
    select {
        padding: 0.6rem;
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

    label {
        font-size: 0.9rem;
        font-weight: 500;
    }

    .checkbox-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.25rem;
    }

    button {
        padding: 0.6rem 1rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 600;
        transition: background 0.15s;
    }

    button:hover {
        opacity: 0.95;
    }

    .modal-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .modal-actions button[type='submit'] {
        background: #2563eb;
        color: white;
    }

    .secondary {
        background: #e5e7eb;
        color: #111827;
    }

    .danger {
        background: #dc2626;
        color: white;
    }

    .delete-form {
        margin-top: 1rem;
        border-top: 1px solid #e5e7eb;
        padding-top: 0.75rem;
    }

    .confirm-box {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #111827;
    }

    .inline-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }
</style>
