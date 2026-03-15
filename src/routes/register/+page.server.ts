import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (locals.user) throw redirect(303, '/budget');
    return {};
};

export const actions: Actions = {
    default: async ({ request, cookies, locals }) => {
        const form = await request.formData();

        const email = form.get('email') as string;
        const password = form.get('password') as string;
        const full_name = form.get('name') as string;

        if (!email || !password || !full_name) {
            return fail(400, { error: 'Alla fält måste fyllas i.' });
        }

        const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // 1. Skapa användare
        const { data: signUpData, error: signUpError } = await anon.auth.signUp({
            email,
            password
        });

        if (signUpError || !signUpData.user) {
            return fail(400, { error: signUpError?.message ?? 'Kunde inte skapa användare.' });
        }

        // 2. Logga in användaren
        const { data: loginData, error: loginError } = await anon.auth.signInWithPassword({
            email,
            password
        });

        if (loginError || !loginData.session) {
            return fail(400, { error: loginError?.message ?? 'Kunde inte logga in.' });
        }

        const session = loginData.session;

        // 3. Spara tokens i cookies
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

        // 4. Skapa profil via locals.supabase (med session → RLS OK)
        const supabase = locals.supabase;

        const { error: profileError } = await supabase.from('profiles').insert({
            id: signUpData.user.id,
            full_name
        });

        if (profileError) {
            return fail(400, { error: profileError.message });
        }

        // 5. Gå vidare till hushållsval
        throw redirect(303, '/register/next');
    }
};
