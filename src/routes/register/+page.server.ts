import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    // Om användaren redan är inloggad → skicka hem
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

        // ⭐ Skapa användare i Auth
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password
        });

        if (signUpError || !signUpData.user) {
            console.error('Signup error:', signUpError);
            return fail(400, { error: signUpError?.message ?? 'Kunde inte skapa användare.' });
        }

        const userId = signUpData.user.id;

        // ⭐ Skapa profil
        const { error: profileError } = await supabase.from('profiles').insert({
            id: userId,
            full_name
        });

        if (profileError) {
            console.error('Profile insert error:', profileError);
            return fail(400, { error: profileError.message });
        }

        // ⭐ Skapa hushåll
        const { data: household, error: householdError } = await supabase
            .from('households')
            .insert({})
            .select()
            .single();

        if (householdError) {
            console.error('Household creation error:', householdError);
            return fail(400, { error: householdError.message });
        }

        // ⭐ Lägg till användaren i hushållet
        const { error: memberError } = await supabase.from('household_members').insert({
            household_id: household.id,
            user_id: userId,
            role: 'owner'
        });

        if (memberError) {
            console.error('Household member error:', memberError);
            return fail(400, { error: memberError.message });
        }

        // ⭐ Logga in användaren direkt
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (loginError || !loginData.session) {
            console.error('Login error:', loginError);
            return fail(400, { error: loginError?.message ?? 'Kunde inte logga in.' });
        }

        const session = loginData.session;

        // ⭐ Spara tokens i cookies
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

        // ⭐ Spara household_id i cookie
        cookies.set('household_id', household.id, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
            maxAge: 60 * 60 * 24 * 30
        });

        // ⭐ Redirect till dashboard
        throw redirect(303, '/budget');
    }
};
