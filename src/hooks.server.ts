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

    // ⛔ Ingen användare → endast login/register tillåtet
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

    // ⭐ HÄR VAR DET STORA FELET
    // maybeSingle() + RLS = 500-fel överallt.
    // Nu hämtar vi ALLA memberships och tar första.
    const { data: memberships, error: membershipError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id);

    let householdId = null;

    if (!membershipError && memberships && memberships.length > 0) {
        householdId = memberships[0].household_id;
    }

    event.locals.householdId = householdId;

    // ⭐ Tillåtna routes utan hushåll
    const isRegisterRoute = event.url.pathname.startsWith('/register');
    const isJoinRoute = event.url.pathname.startsWith('/join');
    const isLogoutRoute = event.url.pathname === '/logout';
    const isRegisterNextAction =
        event.url.pathname === '/register/next' &&
        event.request.method === 'POST';
    const isJoinAction =
        event.url.pathname === '/join' &&
        event.request.method === 'POST';
    const isCreateHouseholdRoute =
        event.url.pathname.startsWith('/household/create');

    // ⭐ Om användaren saknar hushåll → endast register/join/create tillåtet
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
