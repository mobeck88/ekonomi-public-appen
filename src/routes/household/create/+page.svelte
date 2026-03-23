<script>
    export let form;
</script>

<h1>Skapa nytt hushåll</h1>

<p>Ett nytt hushåll kommer att skapas och du blir ägare.</p>

<form method="POST">
    <button type="submit">Skapa hushåll</button>
</form>

{#if form?.error}
    <p style="color:red; margin-top:1rem">{form.error}</p>
{/if}

<style>
    h1 {
        margin-bottom: 1.2rem;
        color: #1f2937;
        font-size: 1.6rem;
        font-weight: 700;
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
