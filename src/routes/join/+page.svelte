<script lang="ts">
    export let form;
</script>

<h1>Gå med i ett hushåll</h1>

<form method="POST">
    <label for="code">Hushållskod</label>
    <input id="code" name="code" required />

    {#if form?.error}
        <p style="color: red">{form.error}</p>
    {/if}

    <button type="submit">Gå med</button>
</form>
