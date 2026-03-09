<script lang="ts">
    export let form;
</script>

<h1>Skapa konto</h1>

<form method="POST">
    <label for="name">Namn på hushåll</label>
    <input id="name" name="name" type="text" placeholder="Andreas & Hanna" />

    <label for="email">E‑post</label>
    <input id="email" name="email" type="email" required />

    <label for="password">Lösenord</label>
    <input id="password" name="password" type="password" required />

    {#if form?.error}
        <p style="color:red; margin-top:10px">{form.error}</p>
    {/if}

    <button type="submit" style="margin-top:10px">Skapa konto</button>
</form>

<p style="margin-top:20px">
    Har du redan ett konto?
    <a href="/login">Logga in</a>
</p>
