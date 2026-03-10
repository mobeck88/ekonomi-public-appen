import { redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/auth-helpers-sveltekit';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const handle = async ({ event, resolve }) => {
    // Cookie helpers (nya API:t)
    const cookieStore = {
        get: (name) => event.cookies.get(name),
        set: (name, value, options) =>
            event.cookies.set(name, value, {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                secure: true,
                ...options
            }),
        remove: (name, options) =>
            event.cookies.delete(name, {
                path: '/',
                ...options
            })
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
