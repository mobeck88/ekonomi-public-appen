<script>
    import { page } from "$app/stores";
</script>

<nav>
    <a class:selected={$page.url.pathname.startsWith("/incomes")} href="/incomes">Inkomster</a>
    <a class:selected={$page.url.pathname.startsWith("/expenses")} href="/expenses">Utgifter</a>
    <a class:selected={$page.url.pathname.startsWith("/fixed_costs")} href="/fixed_costs">Fasta kostnader</a>
    <a class:selected={$page.url.pathname.startsWith("/subscriptions")} href="/subscriptions">Abonnemang</a>
    <a class:selected={$page.url.pathname.startsWith("/electricity")} href="/electricity">El</a>
    <a class:selected={$page.url.pathname.startsWith("/savings")} href="/savings">Sparande</a>
    <a class:selected={$page.url.pathname.startsWith("/allowance")} href="/allowance">Fickpengar</a>
    <a class:selected={$page.url.pathname.startsWith("/kids_allowance")} href="/kids_allowance">Barnens pengar</a>
    <a class:selected={$page.url.pathname.startsWith("/unexpected_expenses")} href="/unexpected_expenses">Oförutsägbart</a>
    <a class:selected={$page.url.pathname.startsWith("/extra_income")} href="/extra_income">Extra inkomster</a>
    <a class:selected={$page.url.pathname.startsWith("/budget")} href="/budget">Budget</a>
    <a class:selected={$page.url.pathname.startsWith("/skatt")} href="/skatt">Skatt</a>

    <!-- ⭐ Loans (Lån) — nu tillagd -->
    <a class:selected={$page.url.pathname.startsWith("/loans")} href="/loans">Lån</a>

    <!-- Inställningar -->
    <a class:selected={$page.url.pathname.startsWith("/inställningar")} href="/inställningar">Inställningar</a>
</nav>

<style>
    nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.4rem;
        padding: 0.6rem;
        background: #f5f5f5;
        border-bottom: 1px solid #ddd;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    a {
        padding: 0.4rem 0.8rem;
        background: white;
        border: 1px solid #ccc;
        border-radius: 6px;
        text-decoration: none;
        color: #333;
        font-size: 0.85rem;
        white-space: nowrap;
    }

    a.selected {
        background: #0077ff;
        color: white;
        border-color: #0077ff;
        font-weight: bold;
    }

    @media (max-width: 600px) {
        nav {
            overflow-x: auto;
            white-space: nowrap;
        }
    }
</style>
