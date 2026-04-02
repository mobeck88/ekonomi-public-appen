<script lang="ts">
    import { tick } from 'svelte';

    export let data: any;
    const access = data.access;

    let selected: any = null;
    let showList = false;
    let showForm = false;

    const members = access.selectableMembers ?? [];
    let selectedUserId: string = access.selectedUserId;

    let companies = [...(data.companies ?? [])];

    function normalizeDebtForEdit(d: any) {
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

    function newDebt() {
        selected = {
            title: '',
            original_company_name: '',
            original_reference: '',
            collection_company_id: '',
            collection_reference: '',
            amount: '',
            is_kronofogden: false,
            isAddingCompany: false,
            newCompanyName: ''
        };
        showForm = true;
    }

    function editDebt(d: any) {
        selected = normalizeDebtForEdit(d);
        showForm = true;
        showList = false;
    }

    function toggleForm() {
        if (!showForm) {
            if (!selected) {
                newDebt();
            } else {
                showForm = true;
            }
        } else {
            showForm = false;
        }
    }

    function toCurrency(n: number | string | null | undefined) {
        const num = Number(n ?? 0);
        return Number.isFinite(num) ? num : 0;
    }

    // ⭐ INLINE-SKAPANDE BORTTAGET
    // async function createCompanyInline(...) { ... }  ← borttagen

    function cancelNewCompany(stateObj: any) {
        stateObj.isAddingCompany = false;
        stateObj.newCompanyName = '';
        stateObj.collection_company_id = '';
    }
</script>

<h1>Skulder</h1>

{#if access.isOwner || access.isGuardian}
    <div class="section">
        <form method="GET" class="member-selector">
            <label for="user_id">Visa skulder för</label>

            <select
                id="user_id"
                name="user_id"
                bind:value={selectedUserId}
                on:change={(e) => e.target.form.submit()}
            >
                {#each members as m}
                    <option value={m.user_id}>
                        {m.profiles.full_name}
                        {m.user_id === access.currentUserId ? ' (du)' : ''}
                    </option>
                {/each}
            </select>
        </form>
    </div>
{/if}

<div class="section">
    <button class="section-header" on:click={() => (showList = !showList)}>
        <span>Sparade skulder</span>
        <span>{showList ? '▲' : '▼'}</span>
    </button>

    {#if showList}
        {#if data.debts.length === 0}
            <p class="empty">Inga skulder registrerade ännu.</p>
        {:else}
            <table class="month-list">
                <tbody>
                    {#each data.debts as d}
                        <tr on:click={() => access.canEdit && editDebt(d)}>
                            <td>
                                <strong>{d.title}</strong><br />
                                {toCurrency(d.amount)} kr
                            </td>

                            <td>
                                <strong>Grundföretag</strong><br />
                                {d.original_company_name}<br />
                                {d.original_reference}
                            </td>

                            <td>
                                <strong>Inkasso</strong><br />
                                {d.collection_company_name ?? '—'}<br />
                                {d.collection_reference ?? ''}
                            </td>

                            <td>
                                <strong>Kronofogden</strong><br />
                                {d.is_kronofogden ? 'Ja' : 'Nej'}
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    {/if}
</div>

{#if access.canEdit}
    <div class="section">
        <button class="section-header" on:click={toggleForm}>
            <span>{selected?.id ? 'Redigera skuld' : 'Ny skuld'}</span>
            <span>{showForm ? '▲' : '▼'}</span>
        </button>

        {#if showForm}
            <form
                method="POST"
                action={selected?.id ? '?/update_debt' : '?/create_debt'}
                class="create-form"
            >
                {#if selected?.id}
                    <input type="hidden" name="debt_id" value={selected.id} />
                {/if}

                <input type="hidden" name="selected_user_id" value={selectedUserId} />

                <label>Titel</label>
                <input type="text" name="title" required bind:value={selected.title} />

                <label>Grundföretag</label>
                <input type="text" name="original_company_name" required bind:value={selected.original_company_name} />

                <label>Referensnummer (grundföretag)</label>
                <input type="text" name="original_reference" bind:value={selected.original_reference} />

                <label>Inkassobolag</label>

                {#if selected.isAddingCompany}
                    <input
                        type="text"
                        placeholder="Nytt inkassobolag…"
                        bind:value={selected.newCompanyName}
                    />

                    <!-- ⭐ Minimal fix: endast backend skapar -->
                    <input type="hidden" name="collection_company_id" value="__new__" />
                    <input type="hidden" name="new_company_name" value={selected.newCompanyName} />

                    <div class="inline-buttons">
                        <!-- ⭐ KNAPP BORTTAGEN -->
                        <button type="button" class="danger" on:click={() => cancelNewCompany(selected)}>Ångra</button>
                    </div>

                {:else}
                    <select
                        name="collection_company_id"
                        bind:value={selected.collection_company_id}
                        on:change={(e) => {
                            if (e.target.value === '__new__') {
                                selected.isAddingCompany = true;
                                selected.newCompanyName = '';
                                selected.collection_company_id = '__new__';
                            }
                        }}
                    >
                        <option value="">Inget inkasso</option>
                        {#each companies as c}
                            <option value={c.id}>{c.name}</option>
                        {/each}
                        <option value="__new__">Lägg till nytt…</option>
                    </select>
                {/if}

                <label>Referensnummer (inkasso)</label>
                <input type="text" name="collection_reference" bind:value={selected.collection_reference} />

                <label>Belopp</label>
                <input type="number" step="0.01" name="amount" required bind:value={selected.amount} />

                <label class="checkbox-row">
                    <input type="checkbox" name="is_kronofogden" bind:checked={selected.is_kronofogden} />
                    Är hos Kronofogden
                </label>

                <button type="submit">
                    {selected?.id ? 'Spara ändringar' : 'Spara skuld'}
                </button>
            </form>
        {/if}
    </div>
{/if}

<style>
    .section { margin-bottom: 2rem; }
    .section-header {
        width: 100%;
        background: #f3f4f6;
        padding: 0.8rem;
        border-radius: 6px;
        font-weight: bold;
        display: flex;
        justify-content: space-between;
        cursor: pointer;
    }
    .month-list { width: 100%; border-collapse: collapse; }
    .month-list td { padding: 0.6rem; border-bottom: 1px solid #ddd; }
    .create-form { display: flex; flex-direction: column; gap: 0.8rem; }
    .inline-buttons { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .danger { background: #dc2626; color: white; }
    .checkbox-row { display: flex; align-items: center; gap: 0.5rem; }

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
</style>
