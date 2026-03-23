import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const handle = async ({ event, resolve }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { fetch: event.fetch },
        cookies: {
            get: (name) => event.cookies.get(name),
            set: (name, value, options) => event.cookies.set(name, value, options),
            remove: (name, options) => event.cookies.delete(name, options)
        }
    });

    event.locals.supabase = supabase;

    const access_token = event.cookies.get('sb-access-token');
    const refresh_token = event.cookies.get('sb-refresh-token');

    let user = null;

    if (access_token && refresh_token) {
        await supabase.auth.setSession({
            access_token,
            refresh_token
        });

        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
    }

    const publicRoutes = ['/login', '/register'];

    if (!user) {
        if (!publicRoutes.includes(event.url.pathname)) {
            throw redirect(303, '/login');
        }

        return resolve(event, {
            filterSerializedResponseHeaders(name) {
                return name === 'set-cookie';
            }
        });
    }

    event.locals.user = user;

    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();

    const householdId = membership?.household_id ?? null;
    event.locals.householdId = householdId;

    // Tillåtna routes utan hushåll
    const isRegisterRoute = event.url.pathname.startsWith('/register');
    const isJoinRoute = event.url.pathname.startsWith('/join');
    const isLogoutRoute = event.url.pathname === '/logout';
    const isRegisterNextAction =
        event.url.pathname === '/register/next' &&
        event.request.method === 'POST';
    const isJoinAction =
        event.url.pathname === '/join' &&
        event.request.method === 'POST';

    // FIX: Tillåt create-route
    const isCreateHouseholdRoute =
        event.url.pathname.startsWith('/household/create');

    if (
        !householdId &&
        !isRegisterRoute &&
        !isJoinRoute &&
        !isJoinAction &&
        !isLogoutRoute &&
        !isRegisterNextAction &&
        !isCreateHouseholdRoute
    ) {
        throw redirect(303, '/register/next');
    }

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'set-cookie';
        }
    });
};
