<script>
    import { page } from "$app/stores";
    let open = false;

    const links = [
        { label: "Inkomster", path: "/incomes" },
        { label: "Utgifter", path: "/expenses" },
        { label: "Fasta kostnader", path: "/fixed_costs" },
        { label: "Abonnemang", path: "/subscriptions" },
        { label: "El", path: "/electricity" },
        { label: "Sparande", path: "/savings" },
        { label: "Fickpengar", path: "/allowance" },
        { label: "Barnens pengar", path: "/kids_allowance" },
        { label: "Oförutsägbart", path: "/unexpected_expenses" },
        { label: "Extra inkomster", path: "/extra_income" },
        { label: "Budget", path: "/budget" },
        { label: "Skatt", path: "/skatt" },
        { label: "Lån", path: "/loans" },
        { label: "Inställningar", path: "/inställningar" }
    ];
</script>

<!-- MOBIL TOPPBAR -->
<div class="mobile-nav">
    <button class="hamburger" on:click={() => (open = !open)}>
        ☰
    </button>
    <span class="title">Ekonomi</span>
</div>

<!-- MOBIL MENY (slide-down) -->
{#if open}
<nav class="mobile-menu">
    {#each links as link}
        <a
            href={link.path}
            class:selected={$page.url.pathname.startsWith(link.path)}
            on:click={() => (open = false)}
        >
            {link.label}
        </a>
    {/each}
</nav>
{/if}

<!-- DESKTOP SIDOMENY -->
<nav class="desktop-nav">
    {#each links as link}
        <a
            href={link.path}
            class:selected={$page.url.pathname.startsWith(link.path)}
        >
            {link.label}
        </a>
    {/each}
</nav>

<style>
    /* MOBIL TOPPBAR */
    .mobile-nav {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: #ffffff;
        border-bottom: 1px solid #e5e5e5;
    }

    .hamburger {
        font-size: 26px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
    }

    .title {
        font-size: 18px;
        font-weight: 600;
        margin-left: 12px;
    }

    /* MOBIL MENY */
    .mobile-menu {
        display: flex;
        flex-direction: column;
        background: #fafafa;
        border-bottom: 1px solid #e5e5e5;
    }

    .mobile-menu a {
        padding: 14px 20px;
        border-bottom: 1px solid #e5e5e5;
        text-decoration: none;
        color: #333;
        font-size: 16px;
    }

    .mobile-menu a.selected {
        background: #0077ff;
        color: white;
        font-weight: bold;
    }

    /* DESKTOP SIDOMENY */
    .desktop-nav {
        display: none;
    }

    @media (min-width: 768px) {
        .mobile-nav,
        .mobile-menu {
            display: none;
        }

        .desktop-nav {
            display: flex;
            flex-direction: column;
            width: 220px;
            background: #ffffff;
            border-right: 1px solid #e5e5e5;
            padding: 20px;
        }

        .desktop-nav a {
            padding: 10px 0;
            text-decoration: none;
            color: #333;
            font-size: 15px;
            border-radius: 6px;
        }

        .desktop-nav a:hover {
            background: #f0f0f0;
        }

        .desktop-nav a.selected {
            background: #0077ff;
            color: white;
            font-weight: bold;
            padding-left: 12px;
        }
    }
</style>
