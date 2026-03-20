<script lang="ts">
    export let data;
    export let form;

    let isMember = form?.isMember ?? data.isMemberOfChurch;
    let hasGuardian = form?.hasGuardian ?? data.hasGuardian;
    let message = form?.message ?? "";

    let showChurch = false;
    let showPassword = false;
    let showLogout = false;
    let showHousehold = false;
    let showGuardian = false;
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

<!-- God man -->
<div class="section">
    <button class="section-header" on:click={() => (showGuardian = !showGuardian)}>
        <span>God man</span>
        <span>{showGuardian ? "▲" : "▼"}</span>
    </button>

    {#if showGuardian}
        <form method="POST" action="?/updateGuardianStatus" class="form">
            <label class="checkbox-row">
                <input type="checkbox" name="hasGuardian" bind:checked={hasGuardian}>
                Jag har en god man
            </label>

            <button type="submit">Spara</button>
        </form>
    {/if}
</div>

<!-- Kyrkotillhörighet -->
<div class="section">
    <button class="section-header" on:click={() => (showChurch = !showChurch)}>
        <span>Kyrkotillhörighet</span>
        <span>{showChurch ? "▲" : "▼"}</span>
    </button>

    {#if showChurch}
        <form method="POST" action="?/updateChurch" class="form">
            <label class="checkbox-row">
                <input type="checkbox" name="isMember" bind:checked={isMember}>
                Jag är medlem i Svenska kyrkan
            </label>

            <button type="submit">Spara</button>
        </form>
    {/if}
</div>

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
    /* (samma CSS som tidigare, oförändrat) */
</style>
