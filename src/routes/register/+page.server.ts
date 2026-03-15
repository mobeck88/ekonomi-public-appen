import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (locals.user) throw redirect(303, '/budget');
    return {};
};

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const form = await request.formData();

        const email = form.get('email') as string;
        const password = form.get('password') as string;
        const full_name = form.get('name') as string;

        if (!email || !password || !full_name) {
            return fail(400, { error: 'Alla fält måste fyllas i.' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Skapa användare
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password
        });

        if (signUpError || !signUpData.user) {
            return fail(400, { error: signUpError?.message ?? 'Kunde inte skapa användare.' });
        }

        const userId = signUpData.user.id;

        // Skapa profil
        const { error: profileError } = await supabase.from('profiles').insert({
            id: userId,
            full_name
        });

        if (profileError) {
            return fail(400, { error: profileError.message });
        }

        // Logga in användaren direkt
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (loginError || !loginData.session) {
            return fail(400, { error: loginError?.message ?? 'Kunde inte logga in.' });
        }

        const session = loginData.session;

        // Spara tokens i cookies
        cookies.set('sb-access-token', session.access_token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
            maxAge: 60 * 60 * 24 * 7
        });

        cookies.set('sb-refresh-token', session.refresh_token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
            maxAge: 60 * 60 * 24 * 30
        });

        // Redirect till nästa steg
        throw redirect(303, '/register/next');
    }
};
