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

        if (error) {
            return fail(400, { error: error.message });
        }

        // Sätt sessionen i cookies
        cookies.set('sb-access-token', data.session.access_token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
            maxAge: 60 * 60 * 24 * 7
        });

        return redirect(303, '/budget');
    }
};
