<script>
    export let form;
</script>

<h1>Logga in</h1>

<form method="POST">
    <input name="email" type="email" placeholder="E‑post" required />
    <input name="password" type="password" placeholder="Lösenord" required />

    {#if form?.error}
        <p style="color:red">{form.error}</p>
    {/if}

    <button type="submit">Logga in</button>
</form>
<p>
    Har du inget konto?
    <a href="/register">Skapa konto</a>
</p>
