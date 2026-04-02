<script lang="ts">
    export let form;
</script>

<h1>Logga in</h1>

<div class="section">
    <form method="POST" class="form">

        <label for="email">E‑post</label>
        <input id="email" name="email" type="email" required />

        <label for="password">Lösenord</label>
        <input id="password" name="password" type="password" required />

        {#if form?.error}
            <p class="error">{form.error}</p>
        {/if}

        <button type="submit">Logga in</button>
    </form>
</div>

<p class="register">
    Har du inget konto?
    <a href="/register">Skapa konto</a>
</p>

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    .section {
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background: #ffffff;
        padding: 1.5rem;
        max-width: 420px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .form {
        display: grid;
        gap: 1rem;
    }

    input {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    input:focus {
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

    .error {
        color: #dc2626;
        font-size: 0.9rem;
        margin-top: -0.5rem;
    }

    .register {
        margin-top: 1rem;
        font-size: 0.95rem;
    }

    .register a {
        color: #2563eb;
        font-weight: 600;
    }
</style>
