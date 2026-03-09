<script lang="ts">
    export let data;
    export let form;
</script>

<h1>Hushåll</h1>

{#if !data.user}
    <p>Du måste vara inloggad för att se hushåll.</p>
{:else}
    {#if data.householdId}
        <p><strong>Ditt hushålls‑ID (kod):</strong></p>
        <pre>{data.householdId}</pre>
        <p>Ge den här koden till din partner så kan hen gå med i samma hushåll.</p>
        <p>Din roll: {data.role}</p>
    {:else}
        <p>Du tillhör inget hushåll ännu.</p>
    {/if}

    <h2>Gå med i ett hushåll</h2>
    <form method="POST" action="?/join">
        <label for="code">Hushållskod</label>
        <input id="code" name="code" type="text" required />

        {#if form?.error}
            <p style="color:red; margin-top:10px">{form.error}</p>
        {/if}

        {#if form?.success}
            <p style="color:green; margin-top:10px">Du har gått med i hushållet.</p>
        {/if}

        <button type="submit" style="margin-top:10px">Gå med</button>
    </form>
{/if}
