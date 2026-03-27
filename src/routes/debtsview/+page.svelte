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
        <p class="amount">{toCurrency(totalKrono)} kr</p>
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
    <div class="modal-backdrop" on:click={closeModal}></div>

    <div class="modal" on:click|stopPropagation>
        <h2>Redigera skuld</h2>

        <form method="POST" action="?/update_debt" class="modal-form">
            <input type="hidden" name="debt_id" value={editing.id} />
            <input type="hidden" name="selected_user_id" value={access.selectedUserId} />

            <label>Titel</label>
            <input type="text" name="title" required bind:value={editing.title} />

            <label>Grundföretag</label>
            <input type="text" name="original_company_name" required bind:value={editing.original_company_name} />

            <label>Referensnummer (grundföretag)</label>
            <input type="text" name="original_reference" bind:value={editing.original_reference} />

            <label>Inkassobolag</label>

            {#if editing.isAddingCompany}
                <input
                    type="text"
                    placeholder="Nytt inkassobolag…"
                    bind:value={editing.newCompanyName}
                />

                <input type="hidden" name="collection_company_id" value={editing.collection_company_id} />

                <div class="inline-buttons">
                    <button type="button" on:click={() => createCompanyInline(editing)}>Spara bolag</button>
                    <button type="button" class="danger" on:click={() => cancelNewCompany(editing)}>Ångra</button>
                </div>

            {:else}
                <select
                    name="collection_company_id"
                    bind:value={editing.collection_company_id}
                    on:change={(e) => {
                        const v = e.target.value;
                        if (v === '__new__') {
                            editing.isAddingCompany = true;
                            editing.newCompanyName = '';
                            editing.collection_company_id = '';
                        }
                    }}
                >
                    <option value="">Inget inkasso</option>
                    {#each data.companies as c}
                        <option value={c.id}>{c.name}</option>
                    {/each}
                    <option value="__new__">Lägg till nytt…</option>
                </select>
            {/if}

            <label>Referensnummer (inkasso)</label>
            <input type="text" name="collection_reference" bind:value={editing.collection_reference} />

            <label>Belopp</label>
            <input type="number" step="0.01" name="amount" required bind:value={editing.amount} />

            <label class="checkbox-row">
                <input type="checkbox" name="is_kronofogden" bind:checked={editing.is_kronofogden} />
                Är hos Kronofogden
            </label>

            <div class="modal-actions">
                <button type="submit">Spara</button>
                <button type="button" class="secondary" on:click={closeModal}>Stäng</button>
            </div>
        </form>

        <form method="POST" action="?/delete_debt" class="delete-form">
            <input type="hidden" name="debt_id" value={editing.id} />
            <input type="hidden" name="selected_user_id" value={access.selectedUserId} />

            {#if !confirmDelete}
                <button type="button" class="danger" on:click={() => (confirmDelete = true)}>
                    Ta bort skuld
                </button>
            {:else}
                <div class="confirm-box">
                    <span>Är du säker på att du vill ta bort skulden?</span>
                    <div class="inline-buttons">
                        <button type="submit" class="danger">Ja, ta bort</button>
                        <button type="button" class="secondary" on:click={() => (confirmDelete = false)}>
                            Avbryt
                        </button>
                    </div>
                </div>
            {/if}
        </form>
    </div>
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

    .total-all {
        margin-left: auto;
        font-size: 1.2rem;
        color: #111;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .card {
        background: white;
        padding: 1rem;
        border-radius: 8px;
        cursor: pointer;
        border: 1px solid #e5e7eb;
    }

    .card.danger {
        background: #fee2e2;
        border-color: #fca5a5;
    }

    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.4);
    }

    .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 2rem;
        border-radius: 10px;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
    }

    .modal-form,
    .delete-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-top: 1rem;
    }

    .inline-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .danger {
        background: #dc2626;
        color: white;
    }

    .secondary {
        background: #e5e7eb;
    }

    .checkbox-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
</style>
