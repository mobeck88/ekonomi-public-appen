{#if selected?.isAddingCompany}
    <input
        type="text"
        placeholder="Nytt inkassobolag…"
        bind:value={selected.newCompanyName}
    />

    <!-- ⭐ FIX: Se till att ID skickas även när select är gömd -->
    <input type="hidden" name="collection_company_id" value={selected.collection_company_id} />

    <div style="display:flex; gap:0.5rem;">
        <button type="button" on:click={() => createCompanyInline(selected)}>
            Spara
        </button>
        <button
            type="button"
            class="danger"
            on:click={() => cancelNewCompany(selected)}
        >
            Ångra
        </button>
    </div>
{:else}
    <select
        name="collection_company_id"
        bind:value={selected.collection_company_id}
        on:change={(e) => {
            if (e.target.value === '__new__') {
                selected.isAddingCompany = true;
                selected.newCompanyName = '';
                selected.collection_company_id = '';
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
