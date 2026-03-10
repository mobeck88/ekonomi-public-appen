import { redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/auth-helpers-sveltekit';

export const handle = async ({ event, resolve }) => {
    // Skapa Supabase-serverklient som läser cookies automatiskt
    event.locals.supabase = createServerClient(event, {
        supabaseUrl: event.env.SUPABASE_URL,
        supabaseKey: event.env.SUPABASE_ANON_KEY
    });

    // Hämta session
    const {
        data: { session }
    } = await event.locals.supabase.auth.getSession();

    event.locals.session = session;
    event.locals.user = session?.user ?? null;
    event.locals.householdId = null;

    const publicRoutes = ['/login', '/register'];

    // Om ingen session → blockera allt utom public routes
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
