import { supabase } from '$lib/supabaseClient';

export async function login(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw new Error(error.message);
    }
}

export async function register(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
        email,
        password
    });

    if (error) {
        throw new Error(error.message);
    }
}
