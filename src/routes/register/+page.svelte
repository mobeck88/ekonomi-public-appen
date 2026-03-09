<script lang="ts">
    import { supabase } from '$lib/supabaseClient';
    import { goto } from '$app/navigation';

    let email = '';
    let password = '';
    let errorMessage = '';
    let loading = false;

    const register = async () => {
        loading = true;
        errorMessage = '';

        const { error } = await supabase.auth.signUp({
            email,
            password
        });

        loading = false;

        if (error) {
            errorMessage = error.message;
            return;
        }

        // Efter registrering → tillbaka till login
        goto('/login');
    };
</script>

<h1>Skapa konto</h1>

<form on:submit|preventDefault={register}>
    <label for="email">E‑post</label>
    <input id="email" type="email" bind:value={email} required />

    <label for="password">Lösenord</label>
    <input id="password" type="password" bind:value={password} required />

    {#if errorMessage}
        <p style="color:red; margin-top:10px">{errorMessage}</p>
    {/if}

    <button type="submit" disabled={loading} style="margin-top:15px">
        {loading ? 'Skapar konto...' : 'Skapa konto'}
    </button>
</form>

<p style="margin-top:20px">
    Har du redan ett konto?
    <a href="/login">Logga in</a>
</p>
