<script>
    import { page } from "$app/stores";
    let open = false;

    const links = [
        // --- MÅNADSKOLL ---
        { label: "Månadskoll", header: true },
        { label: "Inkomster", path: "/incomes" },
        { label: "El", path: "/electricity" },
        { label: "Budget", path: "/budget" },
        { label: "Skatt", path: "/skatt" },

        // --- UTGIFTER ---
        { label: "Utgifter", header: true },
        { label: "Utgifter", path: "/expenses" },
        { label: "Fasta kostnader", path: "/fixed_costs" },
        { label: "Abonnemang", path: "/subscriptions" },
        { label: "Sparande", path: "/savings" },
        { label: "Fickpengar", path: "/allowance" },
        { label: "Barnens pengar", path: "/kids_allowance" },
        { label: "Lån", path: "/loans" },

        // --- ÖVRIGT ---
        { label: "Övrigt", header: true },
        { label: "Oförutsägbart", path: "/unexpected_expenses" },
        { label: "Extra inkomster", path: "/extra_income" },

        // --- INSTÄLLNINGAR ---
        { label: "Inställningar", header: true },
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

<!-- MOBIL MENY -->
{#if open}
<nav class="mobile-menu">
    <div class="mobile-scroll">
        {#each links as link}
            {#if link.header}
                <div class="menu-header">{link.label}</div>
            {:else}
                <a
                    href={link.path}
                    class:selected={$page.url.pathname.startsWith(link.path)}
                    on:click={() => (open = false)}
                >
                    {link.label}
                </a>
            {/if}
        {/each}
    </div>
</nav>
{/if}

<!-- DESKTOP SIDOMENY -->
<nav class="desktop-nav">
    {#each links as link}
        {#if link.header}
            <div class="menu-header">{link.label}</div>
        {:else}
            <a
                href={link.path}
                class:selected={$page.url.pathname.startsWith(link.path)}
            >
                {link.label}
            </a>
        {/if}
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
        position: sticky;
        top: 0;
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

    /* MOBIL MENY */
    .mobile-menu {
        background: #fafafa;
        border-bottom: 1px solid #e5e5e5;
        max-height: 80vh;
        overflow: hidden;
    }

    .mobile-scroll {
        overflow-y: auto;
        max-height: 80vh;
        padding-bottom: 20px;
    }

    .mobile-menu a {
        padding: 14px 20px;
        border-bottom: 1px solid #e5e5e5;
        text-decoration: none;
        color: #333;
        font-size: 16px;
        display: block;
    }

    .mobile-menu a.selected {
        background: #0077ff;
        color: white;
        font-weight: bold;
    }

    .menu-header {
        padding: 14px 20px;
        font-size: 14px;
        font-weight: 700;
        color: #666;
        background: #f0f0f0;
        border-bottom: 1px solid #e5e5e5;
        text-transform: uppercase;
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
            width: 240px;
            background: #ffffff;
            border-right: 1px solid #e5e5e5;
            padding: 20px;
            height: 100vh;
            overflow-y: auto;
            position: sticky;
            top: 0;
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

        .menu-header {
            margin-top: 22px;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 700;
            color: #555;
            text-transform: uppercase;
        }
    }
</style>
