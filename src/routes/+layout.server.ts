import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load = async ({ cookies, url, locals }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const access_token = cookies.get('sb-access-token');

    const publicRoutes = ['/login', '/register'];

    // Ingen session → tillåt bara public routes
    if (!access_token) {
        if (!publicRoutes.includes(url.pathname)) {
            throw redirect(303, '/login');
        }
        locals.user = null;
        return { user: null, householdId: null };
    }

    // Hämta användaren
    const { data: userData, error: userError } = await supabase.auth.getUser(access_token);

    if (userError || !userData.user) {
        cookies.delete('sb-access-token', { path: '/' });
        throw redirect(303, '/login');
    }

    const user = userData.user;

    // Hämta household för användaren
    const { data: memberships, error: memberError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1);

    if (memberError) {
        console.error('Error fetching household membership', memberError);
    }

    const householdId = memberships && memberships.length > 0 ? memberships[0].household_id : null;

    locals.user = user;

    return {
        user,
        householdId
    };
};
