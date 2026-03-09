<script lang="ts">
    import { register } from '$lib/api';
    import { goto } from '$app/navigation';

    let email = '';
    let password = '';
    let errorMessage = '';
    let loading = false;

    const createAccount = async () => {
        loading = true;
        errorMessage = '';

        try {
            await register(email, password);
            goto('/login');
        } catch (error: any) {
            errorMessage = error.message;
        } finally {
            loading = false;
        }
    };
</script>

<h1>Skapa konto</h1>

<form on:submit|preventDefault={createAccount}>
    <label for="email">E‑post</label>
    <input id="email" type="email" bind:value={email} required />

    <label for="password">Lösenord</label>
    <input id="password" type="password" bind:value={password} required />

    {#if errorMessage}
        <p style="color:red; margin-top:10px">{errorMessage}</p>
    {/if}

    <button type="submit" disabled={loading} style="margin-top:10px">
        {loading ? 'Skapar konto...' : 'Skapa konto'}
    </button>
</form>

<p style="margin-top:20px">
    Har du redan ett konto?
    <a href="/login">Logga in</a>
</p>
