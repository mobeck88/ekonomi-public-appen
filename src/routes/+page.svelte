<script lang="ts">
    export let data;

    const sum = (arr, field) =>
        arr?.reduce((a, b) => a + (Number(b[field]) || 0), 0) ?? 0;

    const ownerLabel = (owner) => {
        if (owner === "shared") return "Gemensamt";
        const match = data.members?.find(m => m.user_id === owner);
        return match?.profiles?.full_name ?? owner;
    };
</script>

<h1>Välkommen {data.user.email}</h1>

<div class="grid">
    <!-- Extra inkomster -->
    <div class="card">
        <h2>Extra inkomster</h2>
        <p>Poster: {data.incomes?.length ?? 0}</p>
        <p>Summa: {sum(data.incomes, 'amount')} kr</p>
    </div>

    <!-- Gemensamma utgifter -->
    <div class="card">
        <h2>Gemensamma utgifter</h2>
        <p>Poster: {data.expenses?.length ?? 0}</p>
        <p>Summa: {sum(data.expenses, 'amount')} kr</p>
    </div>

    <!-- Abonnemang -->
    <div class="card">
        <h2>Abonnemang</h2>
        <p>Aktiva: {data.subscriptions?.length ?? 0}</p>
        <p>Månadskostnad: {sum(data.subscriptions, 'amount')} kr</p>
    </div>

    <!-- Elförbrukning -->
    <div class="card">
        <h2>Elförbrukning</h2>
        <p>Månader: {data.electricity?.length ?? 0}</p>
        <p>Total kostnad: {sum(data.electricity, 'cost')} kr</p>
    </div>

    <!-- Sparande -->
    <div class="card">
        <h2>Sparande</h2>
        <p>Konton: {data.savings?.length ?? 0}</p>
        <p>Saldo: {sum(data.savings, 'balance')} kr</p>
    </div>
</div>

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1.5rem;
        margin-top: 2rem;
    }

    .card {
        padding: 1.5rem;
        border-radius: 12px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    h2 {
        margin-top: 0;
        font-size: 1.2rem;
        color: #111827;
    }

    p {
        margin: 0.3rem 0;
        color: #374151;
    }
</style>
