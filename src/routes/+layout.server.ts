import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load = async ({ cookies, url, locals }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const access_token = cookies.get('sb-access-token');

    // Ingen session → redirect till login
    if (!access_token) {
        if (url.pathname !== '/login') {
            throw redirect(303, '/login');
        }
        locals.user = null;
        return { user: null };
    }

    // Hämta användaren
    const { data, error } = await supabase.auth.getUser(access_token);

    if (error || !data.user) {
        cookies.delete('sb-access-token', { path: '/' });
        throw redirect(303, '/login');
    }

    // Spara användaren i locals
    locals.user = data.user;

    return {
        user: data.user
    };
};
