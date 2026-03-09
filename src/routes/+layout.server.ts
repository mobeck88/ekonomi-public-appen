import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load = async ({ cookies, url, locals }) => {
    const access_token = cookies.get('sb-access-token');
    const refresh_token = cookies.get('sb-refresh-token');

    const publicRoutes = ['/login', '/register'];

    // ⭐ Skapa Supabase‑client med auth‑headers
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: access_token
                ? { Authorization: `Bearer ${access_token}` }
                : {}
        }
    });

    locals.supabase = supabase;
    locals.user = null;
    locals.householdId = null;

    // ⭐ Ingen session → tillåt bara public routes
    if (!access_token) {
        if (!publicRoutes.includes(url.pathname)) {
            throw redirect(303, '/login');
        }
        return { user: null, householdId: null };
    }

    // ⭐ Försök hämta användaren
    let { data: userData, error: userError } = await supabase.auth.getUser();

    // ⭐ Access-token kan vara ogiltig → försök förnya sessionen
    if (userError || !userData?.user) {
        if (refresh_token) {
            const { data: refreshData, error: refreshError } =
                await supabase.auth.refreshSession({ refresh_token });

            if (!refreshError && refreshData?.session) {
                // Uppdatera cookies
                cookies.set('sb-access-token', refreshData.session.access_token, {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                    secure: true
                });

                cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                    secure: true
                });

                // Uppdatera auth‑header
                supabase.auth.setSession(refreshData.session);

                userData = { user: refreshData.session.user };
            } else {
                // Kunde inte förnya → logga ut
                cookies.delete('sb-access-token', { path: '/' });
                cookies.delete('sb-refresh-token', { path: '/' });
                throw redirect(303, '/login');
            }
        } else {
            cookies.delete('sb-access-token', { path: '/' });
            throw redirect(303, '/login');
        }
    }

    const user = userData.user;
    locals.user = user;

    // ⭐ Hämta householdId
    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

    if (membership) {
        locals.householdId = membership.household_id;
    }

    return {
        user,
        householdId: locals.householdId
    };
};
