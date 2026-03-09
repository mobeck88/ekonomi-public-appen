<script lang="ts">
    import { login } from '$lib/api';
    import { goto } from '$app/navigation';

    let email = '';
    let password = '';
    let errorMessage = '';
    let loading = false;

    const doLogin = async () => {
        loading = true;
        errorMessage = '';

        try {
            await login(email, password);
            goto('/budget');
        } catch (error: any) {
            errorMessage = error.message;
        } finally {
            loading = false;
        }
    };
</script>

<h1>Logga in</h1>

<form on:submit|preventDefault={doLogin}>
    <label for="email">E‑post</label>
    <input id="email" type="email" bind:value={email} required />

    <label for="password">Lösenord</label>
    <input id="password" type="password" bind:value={password} required />

    {#if errorMessage}
        <p style="color:red; margin-top:10px">{errorMessage}</p>
    {/if}

    <button type="submit" disabled={loading} style="margin-top:10px">
        {loading ? 'Loggar in...' : 'Logga in'}
    </button>
</form>

<p style="margin-top:20px">
    Har du inget konto?
    <a href="/register">Skapa konto</a>
</p>
