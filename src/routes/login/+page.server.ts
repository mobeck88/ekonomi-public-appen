import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const actions = {
    default: async ({ request, cookies }) => {
        const form = await request.formData();
        const email = form.get('email') as string;
        const password = form.get('password') as string;

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // ⭐ Logga in
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.session) {
            return fail(400, { error: error?.message ?? 'Fel vid inloggning' });
        }

        const session = data.session;

        // ⭐ Spara tokens
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

        // ⭐ Hämta household_id
        const { data: householdMember } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', session.user.id)
            .single();

        if (!householdMember) {
            // Om användaren inte är med i något hushåll → redirect till setup
            return redirect(303, '/setup-household');
        }

        // ⭐ Spara household_id i cookie
        cookies.set('household_id', householdMember.household_id, {
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
