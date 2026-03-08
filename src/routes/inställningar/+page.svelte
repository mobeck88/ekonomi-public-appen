<script lang="ts">
    export let data;

    let isMember = data.isMemberOfChurch;
    let message = data.message ?? "";

    let showChurch = false;
    let showPassword = false;
    let showLogout = false;
</script>

<h1>Inställningar</h1>

<!-- ⭐ Kyrkotillhörighet -->
<div class="section">
    <button class="section-header" on:click={() => showChurch = !showChurch}>
        <span>Kyrkotillhörighet</span>
        <span>{showChurch ? "▲" : "▼"}</span>
    </button>

    {#if showChurch}
        <form method="POST" class="form">
            <label class="checkbox-row">
                <input type="checkbox" name="isMember" bind:checked={isMember}>
                Jag är medlem i Svenska kyrkan
            </label>

            <button type="submit" name="action" value="updateChurch">
                Spara
            </button>
        </form>
    {/if}
</div>

<!-- ⭐ Byt lösenord -->
<div class="section">
    <button class="section-header" on:click={() => showPassword = !showPassword}>
        <span>Byt lösenord</span>
        <span>{showPassword ? "▲" : "▼"}</span>
    </button>

    {#if showPassword}
        <form method="POST" class="form">
            <label for="newPassword">Nytt lösenord</label>
            <input type="password" id="newPassword" name="newPassword" required>

            <button type="submit" name="action" value="changePassword">
                Byt lösenord
            </button>
        </form>
    {/if}
</div>

<!-- ⭐ Logga ut -->
<div class="section">
    <button class="section-header" on:click={() => showLogout = !showLogout}>
        <span>Logga ut</span>
        <span>{showLogout ? "▲" : "▼"}</span>
    </button>

    {#if showLogout}
        <form method="POST" class="form">
            <p class="logout-text">Du kommer att loggas ut från appen.</p>
            <button class="danger" name="action" value="logout">Logga ut</button>
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
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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

    input:focus, textarea:focus {
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
