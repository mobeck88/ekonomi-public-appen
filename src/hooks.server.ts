import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false
        }
    });

    event.locals.supabase = supabase;

    const access_token = event.cookies.get('sb-access-token');

    if (access_token) {
        const { data } = await supabase.auth.getUser(access_token);
        event.locals.user = data.user ?? null;
    } else {
        event.locals.user = null;
    }

    return resolve(event);
};
