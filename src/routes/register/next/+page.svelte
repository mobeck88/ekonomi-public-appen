<script lang="ts">
    export let form;
</script>

<h1>Välkommen!</h1>
<p>Vill du gå med i ett hushåll eller skapa ett nytt?</p>

<div class="section">
    <h2>Gå med i hushåll (rekommenderas)</h2>

    <form method="POST" class="form">
        <label for="code">Hushållskod</label>
        <input
            id="code"
            name="code"
            type="text"
            placeholder="Klistra in hushållskod"
            required
        />

        {#if form?.error}
            <p class="error">{form.error}</p>
        {/if}

        <button type="submit" name="join">Gå med i hushåll</button>
    </form>
</div>

<div class="section" style="margin-top: 1.5rem;">
    <h2>Skapa nytt hushåll</h2>

    <form method="POST">
        <button type="submit" name="create">Skapa nytt hushåll</button>
    </form>
</div>

<style>
    /* (style oförändrad) */
</style>
