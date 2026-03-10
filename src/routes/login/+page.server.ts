import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const actions = {
    default: async ({ request, cookies }) => {
        const form = await request.formData();
        const email = form.get('email') as string;
        const password = form.get('password') as string;

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.session) {
            return fail(400, { error: error?.message ?? 'Fel vid inloggning' });
        }

        const session = data.session;

        cookies.set('sb-access-token', session.access_token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true
        });

        cookies.set('sb-refresh-token', session.refresh_token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true
        });

        const { data: householdMember } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', session.user.id)
            .single();

        if (!householdMember) {
            throw redirect(303, '/setup-household');
        }

        cookies.set('household_id', householdMember.household_id, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true
        });

        throw redirect(303, '/budget');
    }
};
