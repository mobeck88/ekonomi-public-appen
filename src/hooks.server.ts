import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const handle = async ({ event, resolve }) => {
    const access_token = event.cookies.get('sb-access-token');
    const refresh_token = event.cookies.get('sb-refresh-token');

    const publicRoutes = ['/login', '/register'];

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: access_token
                ? { Authorization: `Bearer ${access_token}` }
                : {}
        },
        auth: {
            persistSession: false
        }
    });

    event.locals.supabase = supabase;
    event.locals.user = null;
    event.locals.householdId = null;

    if (!access_token) {
        if (!publicRoutes.includes(event.url.pathname)) {
            throw redirect(303, '/login');
        }
        return resolve(event);
    }

    let { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
        if (refresh_token) {
            const { data: refreshData, error: refreshError } =
                await supabase.auth.refreshSession({ refresh_token });

            if (!refreshError && refreshData?.session) {
                event.cookies.set('sb-access-token', refreshData.session.access_token, {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                    secure: true
                });

                event.cookies.set('sb-refresh-token', refreshData.session.refresh_token, {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                    secure: true
                });

                supabase.auth.setSession(refreshData.session);

                userData = { user: refreshData.session.user };
            } else {
                event.cookies.delete('sb-access-token', { path: '/' });
                event.cookies.delete('sb-refresh-token', { path: '/' });
                throw redirect(303, '/login');
            }
        } else {
            event.cookies.delete('sb-access-token', { path: '/' });
            throw redirect(303, '/login');
        }
    }

    const user = userData.user;
    event.locals.user = user;

    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

    if (membership) {
        event.locals.householdId = membership.household_id;
    }

    return resolve(event);
};
