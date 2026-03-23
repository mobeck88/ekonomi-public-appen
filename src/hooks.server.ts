import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const handle = async ({ event, resolve }) => {
    // Skapa Supabase-klient med korrekt cookie-hantering för SSR
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { fetch: event.fetch },
        cookies: {
            get: (name) => event.cookies.get(name),
            set: (name, value, options) => event.cookies.set(name, value, options),
            remove: (name, options) => event.cookies.delete(name, options)
        }
    });

    event.locals.supabase = supabase;

    // Läs tokens från cookies
    const access_token = event.cookies.get('sb-access-token');
    const refresh_token = event.cookies.get('sb-refresh-token');

    let user = null;

    // Sätt sessionen korrekt i SSR
    if (access_token && refresh_token) {
        await supabase.auth.setSession({
            access_token,
            refresh_token
        });

        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
    }

    // Offentliga routes
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

    // Hämta hushållsmedlemskap
    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();

    const householdId = membership?.household_id ?? null;
    event.locals.householdId = householdId;

    // Routes som är tillåtna utan hushåll
    const isRegisterRoute = event.url.pathname.startsWith('/register');
    const isJoinRoute = event.url.pathname.startsWith('/join');
    const isLogoutRoute = event.url.pathname === '/logout';

    const isRegisterNextAction =
        event.url.pathname === '/register/next' &&
        event.request.method === 'POST';

    const isJoinAction =
        event.url.pathname === '/join' &&
        event.request.method === 'POST';

    // Blockera allt annat om användaren saknar hushåll
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