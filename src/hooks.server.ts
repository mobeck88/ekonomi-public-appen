import { redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/auth-helpers-sveltekit';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const handle = async ({ event, resolve }) => {
    // Skapa SSR-säker Supabase-klient
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        cookies: {
            get: (key) => event.cookies.get(key),
            set: (key, value, options) => event.cookies.set(key, value, options),
            remove: (key, options) => event.cookies.delete(key, options)
        }
    });

    event.locals.supabase = supabase;

    // Hämta session + user
    const {
        data: { session }
    } = await supabase.auth.getSession();

    if (!session) {
        const publicRoutes = ['/login', '/register'];
        if (!publicRoutes.includes(event.url.pathname)) {
            throw redirect(303, '/login');
        }
        return resolve(event);
    }

    const user = session.user;
    event.locals.user = user;

    // Hämta householdId
    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

    event.locals.householdId = membership?.household_id ?? null;

    return resolve(event);
};
