<script lang="ts">
    export let form;
</script>

<h1>Gå med i ett hushåll</h1>
<p>Klistra in hushållskoden du fått av ägaren.</p>

<div class="section">
    <form method="POST" class="form">
        <label for="code">Hushållskod</label>
        <input
            id="code"
            name="code"
            type="text"
            placeholder="Ex: 5bf10a6f"
            required
        />

        {#if form?.error}
            <p class="error">{form.error}</p>
        {/if}

        <button type="submit" name="join">Gå med i hushåll</button>
    </form>
</div>

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
    }

    p {
        max-width: 480px;
        color: #374151;
        margin-bottom: 1rem;
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
        margin-top: 0.5rem;
    }

    label {
        font-weight: 600;
        color: #374151;
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
</style>
