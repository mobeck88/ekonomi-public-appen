import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const handle = async ({ event, resolve }) => {
    event.locals.supabase = createSupabaseServerClient({
        supabaseUrl: SUPABASE_URL,
        supabaseKey: SUPABASE_ANON_KEY,
        event
    });

    const {
        data: { session }
    } = await event.locals.supabase.auth.getSession();

    event.locals.user = session?.user ?? null;

    return resolve(event);
};
