<script lang="ts">
    export let data;
    export let form;

    let isMember = form?.isMember ?? data.isMemberOfChurch;
    let hasGuardian = form?.hasGuardian ?? data.hasGuardian;
    let enableAssistance = form?.enableAssistance ?? data.enableAssistance;

    let useCustomRiksnorm = form?.useCustomRiksnorm ?? data.useCustomRiksnorm;

    let selectedYear = form?.riksnormYear ?? data.selectedYear;

    let riksnormAdult = form?.riksnormAdult ?? data.customRiksnorm?.adult ?? "";
    let riksnormChild = form?.riksnormChild ?? data.customRiksnorm?.child ?? "";
    let riksnormShared = form?.riksnormShared ?? data.customRiksnorm?.shared ?? "";

    let message = form?.message ?? "";

    let role = data.role;

    const hideGuardianCheckbox = ["guardian", "child", "youth"].includes(role);
    const hideSettingsSection = ["child", "youth"].includes(role);

    let showSettings = false;
    let showPassword = false;
    let showLogout = false;

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);

    // ⭐ NYTT FÄLT
    let showDebts = form?.showDebts ?? data.showDebts;
</script>

<h1>Inställningar</h1>

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

            {#if enableAssistance}
                <label class="checkbox-row">
                    <input type="checkbox" name="useCustomRiksnorm" bind:checked={useCustomRiksnorm}>
                    Egen riksnorm
                </label>

                {#if useCustomRiksnorm}
                    <div class="subsection">
                        <label>År</label>
                        <select name="riksnormYear" bind:value={selectedYear}>
                            {#each years as y}
                                <option value={y}>{y}</option>
                            {/each}
                        </select>

                        <label>Vuxen</label>
                        <input type="number" name="riksnormAdult" bind:value={riksnormAdult}>

                        <label>Barn</label>
                        <input type="number" name="riksnormChild" bind:value={riksnormChild}>

                        <label>Gemensam</label>
                        <input type="number" name="riksnormShared" bind:value={riksnormShared}>
                    </div>
                {/if}
            {/if}

            <!-- ⭐ NY CHECKBOX -->
            <label class="checkbox-row">
                <input type="checkbox" name="showDebts" bind:checked={showDebts}>
                Visa skulder i menyn
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

    .subsection {
        display: grid;
        gap: 0.6rem;
        padding: 0.6rem;
        background: #f9fafb;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
    }
</style>
