<script>
    export let data;

    const sum = (arr, field) => arr?.reduce((a, b) => a + (Number(b[field]) || 0), 0) ?? 0;
</script>

<h1>Välkommen {data.user.email}</h1>

<div class="grid">
    <div class="card">
        <h2>Inkomster</h2>
        <p>Poster: {data.incomes?.length ?? 0}</p>
        <p>Summa: {sum(data.incomes, 'amount')} kr</p>
    </div>

    <div class="card">
        <h2>Utgifter</h2>
        <p>Poster: {data.expenses?.length ?? 0}</p>
        <p>Summa: {sum(data.expenses, 'amount')} kr</p>
    </div>

    <div class="card">
        <h2>Abonnemang</h2>
        <p>Antal: {data.subscriptions?.length ?? 0}</p>
    </div>

    <div class="card">
        <h2>Elförbrukning</h2>
        <p>Månader: {data.electricity?.length ?? 0}</p>
        <p>Total kostnad: {sum(data.electricity, 'cost')} kr</p>
    </div>

    <div class="card">
        <h2>Sparande</h2>
        <p>Konton: {data.savings?.length ?? 0}</p>
        <p>Saldo: {sum(data.savings, 'balance')} kr</p>
    </div>
</div>

<style>
    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1.5rem;
        margin-top: 2rem;
    }

    .card {
        padding: 1.5rem;
        border-radius: 12px;
        background: #f7f7f7;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }

    h2 {
        margin-top: 0;
    }
</style>
