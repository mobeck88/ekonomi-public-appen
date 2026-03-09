<script lang="ts">
    export let form;
</script>

<h1>Logga in</h1>

<form method="POST">
    <label for="email">E‑post</label>
    <input id="email" name="email" type="email" required />

    <label for="password">Lösenord</label>
    <input id="password" name="password" type="password" required />

    {#if form?.error}
        <p style="color:red; margin-top:10px">{form.error}</p>
    {/if}

    <button type="submit" style="margin-top:10px">Logga in</button>
</form>

<p style="margin-top:20px">
    Har du inget konto?
    <a href="/register">Skapa konto</a>
</p>
