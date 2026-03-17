import { redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/auth-helpers-sveltekit';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const handle = async ({ event, resolve }) => {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
            get: (key) => event.cookies.get(key),
            set: (key, value, options) => event.cookies.set(key, value, options),
            remove: (key, options) => event.cookies.delete(key, options)
        }
    });

    event.locals.supabase = supabase;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;

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

    const isRegisterRoute = event.url.pathname.startsWith('/register');
    const isJoinRoute = event.url.pathname.startsWith('/join');
    const isLogoutRoute = event.url.pathname === '/logout';

    const isRegisterNextAction =
        event.url.pathname === '/register/next' &&
        event.request.method === 'POST';

    // ⭐ NYTT: tillåt POST-actions på /join
    const isJoinAction =
        event.url.pathname === '/join' &&
        event.request.method === 'POST';

    if (
        !householdId &&
        !isRegisterRoute &&
        !isJoinRoute &&
        !isJoinAction &&
        !isLogoutRoute &&
        !isRegisterNextAction
    ) {
        throw redirect(303, '/register/next');
    }

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'set-cookie';
        }
    });
};
