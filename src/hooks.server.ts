import { redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/auth-helpers-sveltekit';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const handle = async ({ event, resolve }) => {
    // Cookie helpers som matchar din auth-helpers-version
    const cookieStore = {
        getAll: () => {
            return event.cookies.getAll().map((cookie) => ({
                name: cookie.name,
                value: cookie.value
            }));
        },
        setAll: (cookies) => {
            cookies.forEach((cookie) => {
                event.cookies.set(cookie.name, cookie.value, {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'lax',
                    secure: true
                });
            });
        }
    };

    // Skapa Supabase-serverklient
    event.locals.supabase = createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        { cookies: cookieStore }
    );

    // Hämta session
    const {
        data: { session }
    } = await event.locals.supabase.auth.getSession();

    event.locals.session = session;
    event.locals.user = session?.user ?? null;
    event.locals.householdId = null;

    const publicRoutes = ['/login', '/register'];

    // Blockera privata routes om ingen session
    if (!session) {
        if (!publicRoutes.includes(event.url.pathname)) {
            throw redirect(303, '/login');
        }
        return resolve(event);
    }

    // Hämta householdId
    const { data: membership } = await event.locals.supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', session.user.id)
        .single();

    if (membership) {
        event.locals.householdId = membership.household_id;
    }

    return resolve(event);
};
