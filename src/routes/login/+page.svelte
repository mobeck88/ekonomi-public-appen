<script lang="ts">
    import { supabase } from '$lib/supabaseClient';
    import { goto } from '$app/navigation';

    let email = '';
    let password = '';
    let errorMessage = '';
    let loading = false;

    const login = async () => {
        loading = true;
        errorMessage = '';

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        loading = false;

        if (error) {
            errorMessage = error.message;
            return;
        }

        goto('/budget');
    };
</script>

<h1>Logga in</h1>

<form on:submit|preventDefault={login}>
    <label for="email">E‑post</label>
    <input id="email" type="email" bind:value={email} required />

    <label for="password">Lösenord</label>
    <input id="password" type="password" bind:value={password} required />

    {#if errorMessage}
        <p style="color:red; margin-top:10px">{errorMessage}</p>
    {/if}

    <button type="submit" disabled={loading} style="margin-top:15px">
        {loading ? 'Loggar in...' : 'Logga in'}
    </button>
</form>

<p style="margin-top:20px">
    Har du inget konto?
    <a href="/register">Skapa konto</a>
</p>
