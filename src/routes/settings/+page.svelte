<script lang="ts">
    export let data;
    export let form;

    let isMember = form?.isMember ?? data.isMemberOfChurch;
    let hasGuardian = form?.hasGuardian ?? data.hasGuardian;
    let enableAssistance = form?.enableAssistance ?? data.enableAssistance;
    let message = form?.message ?? "";

    let role = data.role;

    // Dölj endast checkboxen "Jag har en god man"
    const hideGuardianCheckbox = ["guardian", "child", "youth"].includes(role);

    // Dölj hela inställningssektionen för barn/ungdom
    const hideSettingsSection = ["child", "youth"].includes(role);

    let showSettings = false;
    let showPassword = false;
    let showLogout = false;
    let showHousehold = false;
</script>

<h1>Inställningar</h1>

<!-- Hushåll -->
<div class="section">
    <button class="section-header" on:click={() => (showHousehold = !showHousehold)}>
        <span>Hushåll</span>
        <span>{showHousehold ? "▲" : "▼"}</span>
    </button>

    {#if showHousehold}
        <div class="form">
            <p>Hantera hushåll, bjud in partner eller gå med i ett hushåll.</p>
            <a href="/household">
                <button type="button">Gå till hushållsinställningar</button>
            </a>
        </div>
    {/if}
</div>

<!-- PERSONLIGA INSTÄLLNINGAR (döljs för child/youth) -->
{#if !hideSettingsSection}
<div class="section">
    <button class="section-header" on:click={() => (showSettings = !showSettings)}>
        <span>Personliga inställningar</span>
        <span>{showSettings ? "▲" : "▼"}</span>
    </button>

    {#if showSettings}
        <form method="POST" action="?/updateSettings" class="form">

            <label class="checkbox-row">
                <input type="checkbox" name="enableAssistance" bind:checked={enableAssistance}>
                Visa ekonomiskt bistånd i menyn
            </label>

            {#if !hideGuardianCheckbox}
                <label class="checkbox-row">
                    <input type="checkbox" name="hasGuardian" bind:checked={hasGuardian}>
                    Jag har en god man
                </label>
            {/if}

            <label class="checkbox-row">
                <input type="checkbox" name="isMember" bind:checked={isMember}>
                Jag är medlem i Svenska kyrkan
            </label>

            <button type="submit">Spara</button>
        </form>
    {/if}
</div>
{/if}

<!-- Byt lösenord -->
<div class="section">
    <button class="section-header" on:click={() => (showPassword = !showPassword)}>
        <span>Byt lösenord</span>
        <span>{showPassword ? "▲" : "▼"}</span>
    </button>

    {#if showPassword}
        <form method="POST" action="?/changePassword" class="form">
            <label for="newPassword">Nytt lösenord</label>
            <input type="password" id="newPassword" name="newPassword" required>

            <button type="submit">Byt lösenord</button>
        </form>
    {/if}
</div>

<!-- Logga ut -->
<div class="section">
    <button class="section-header" on:click={() => (showLogout = !showLogout)}>
        <span>Logga ut</span>
        <span>{showLogout ? "▲" : "▼"}</span>
    </button>

    {#if showLogout}
        <form method="GET" action="/logout" class="form">
            <p class="logout-text">Du kommer att loggas ut från appen.</p>
            <button class="danger">Logga ut</button>
        </form>
    {/if}
</div>

{#if message}
    <p class="feedback">{message}</p>
{/if}

<style>
    /* Din CSS är exakt som innan */
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

    .form {
        display: grid;
        gap: 0.9rem;
        padding: 1rem;
        max-width: 420px;
    }

    label {
        font-weight: 600;
        color: #374151;
    }

    .checkbox-row {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        font-weight: 500;
    }

    input[type="password"],
    input[type="text"],
    input[type="date"],
    input[type="number"],
    input[type="month"],
    textarea {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    input:focus,
    textarea:focus {
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

    .logout-text {
        color: #374151;
        margin-bottom: 0.5rem;
    }

    .feedback {
        margin-top: 1rem;
        color: green;
        font-weight: 600;
    }
</style>
