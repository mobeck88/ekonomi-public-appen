<script lang="ts">
    export let data;

    let isMember = data.isMemberOfChurch;
    let message = data.message ?? "";

    let showChurch = false;
    let showPassword = false;
    let showLogout = false;
    let showHousehold = false;
</script>

<h1>Inställningar</h1>

<div class="section">
    <button class="section-header" on:click={() => showChurch = !showChurch}>
        <span>Kyrkotillhörighet</span>
        <span>{showChurch ? "▲" : "▼"}</span>
    </button>

    {#if showChurch}
        <!-- ⭐ KORREKT ACTION -->
        <form method="POST" action="/settings?/updateChurch" class="form">
            <label class="checkbox-row">
                <input type="checkbox" name="isMember" bind:checked={isMember}>
                Jag är medlem i Svenska kyrkan
            </label>

            <button type="submit">Spara</button>
        </form>
    {/if}
</div>

<div class="section">
    <button class="section-header" on:click={() => showPassword = !showPassword}>
        <span>Byt lösenord</span>
        <span>{showPassword ? "▲" : "▼"}</span>
    </button>

    {#if showPassword}
        <form method="POST" action="/settings?/changePassword" class="form">
            <label for="newPassword">Nytt lösenord</label>
            <input type="password" id="newPassword" name="newPassword" required>

            <button type="submit">Byt lösenord</button>
        </form>
    {/if}
</div>

<div class="section">
    <button class="section-header" on:click={() => showLogout = !showLogout}>
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
