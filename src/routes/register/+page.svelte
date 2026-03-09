<script lang="ts">
    import { supabase } from '$lib/supabaseClient';
    import { goto } from '$app/navigation';

    let email = '';
    let password = '';
    let errorMessage = '';

    const register = async () => {
        const { error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            errorMessage = error.message;
            return;
        }

        goto('/login');
    };
</script>

<h1>Skapa konto</h1>

<form on:submit|preventDefault={register}>
    <label>E‑post</label>
    <input type="email" bind:value={email} required />

    <label>Lösenord</label>
    <input type="password" bind:value={password} required />

    {#if errorMessage}
        <p style="color:red">{errorMessage}</p>
    {/if}

    <button type="submit">Skapa konto</button>
</form>

<p>
    Har du redan ett konto?
    <a href="/login">Logga in</a>
</p>
