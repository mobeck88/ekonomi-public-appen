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
        { label: "Skattetabell", path: "/skattetabell" },
        { label: "Skatt", path: "/skatt" },
        { label: "Lån", path: "/loans" },

        /* ⭐ FIX: ASCII-säker label */
        { label: "Settings", path: "/settings" }
    ];
</script>

<!-- MOBIL TOPPBAR -->
<div class="mobile-nav">
    <button class="hamburger" type="button" on:click={() => (open = !open)}>
        ☰
    </button>
    <span class="title">Ekonomi</span>
</div>

<!-- MOBILMENY (Safari-säker) -->
<nav class="mobile-menu {open ? 'open' : ''}">
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

<!-- DESKTOPMENY -->
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
    .mobile-nav {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        background: #ffffff;
        border-bottom: 1px solid #e5e5e5;
        position: relative;
        z-index: 20;
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

    /* SAFARI-SÄKER MOBILMENY */
    .mobile-menu {
        display: none;
        flex-direction: column;
        background: #fafafa;
        border-bottom: 1px solid #e5e5e5;
        position: relative;
        z-index: 10;
    }

    .mobile-menu.open {
        display: flex;
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
