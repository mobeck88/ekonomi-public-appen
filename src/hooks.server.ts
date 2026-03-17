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

    const {
        data: { session }
    } = await supabase.auth.getSession();

    // Offentliga routes som inte kräver login
    const publicRoutes = ['/login', '/register'];

    // Ingen session → endast tillåt public routes
    if (!session) {
        if (!publicRoutes.includes(event.url.pathname)) {
            throw redirect(303, '/login');
        }

        return resolve(event, {
            filterSerializedResponseHeaders(name) {
                return name === 'set-cookie';
            }
        });
    }

    // Användare finns
    const user = session.user;
    event.locals.user = user;

    // Hämta household membership för just denna användare
    const { data: membership, error: membershipError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
        console.error('Membership error:', membershipError);
    }

    const householdId = membership?.household_id ?? null;
    event.locals.householdId = householdId;

    // Routes som ska vara tillåtna även utan hushåll
    const isRegisterRoute = event.url.pathname.startsWith('/register');
    const isJoinRoute = event.url.pathname.startsWith('/join');
    const isLogoutRoute = event.url.pathname === '/logout';

    if (!householdId && !isRegisterRoute && !isJoinRoute && !isLogoutRoute) {
        throw redirect(303, '/register/next');
    }

    // Allt OK → fortsätt
    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'set-cookie';
        }
    });
};
