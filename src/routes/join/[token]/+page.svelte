<script lang="ts">
    export let data;
</script>

<h1>Gå med i hushåll</h1>

<div class="section">
    {#if data.error}
        <p class="error">{data.error}</p>
    {:else}
        <form method="POST" class="join-form">
            <p>Du har blivit inbjuden till ett hushåll.</p>

            <label for="role">Välj din roll</label>
            <select id="role" name="role" required>
                <option value="member">Medlem</option>
                <option value="guardian">God man</option>
            </select>

            <button type="submit">Gå med</button>
        </form>
    {/if}
</div>

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

    .join-form {
        display: grid;
        gap: 1rem;
    }

    label {
        font-weight: 600;
        color: #374151;
    }

    select {
        padding: 0.65rem;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 0.95rem;
        background: #f9fafb;
    }

    .error {
        color: #dc2626;
        font-size: 0.95rem;
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
</style>
