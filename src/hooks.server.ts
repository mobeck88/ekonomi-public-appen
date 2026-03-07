import { createServerClient } from '@supabase/auth-helpers-sveltekit';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    // Skapa Supabase-klient med korrekt cookie-hantering
    event.locals.supabase = createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
            cookies: {
                get: (key) => event.cookies.get(key),
                set: (key, value, options) => {
                    event.cookies.set(key, value, {
                        ...options,
                        path: '/'
                    });
                },
                remove: (key, options) => {
                    event.cookies.delete(key, {
                        ...options,
                        path: '/'
                    });
                }
            }
        }
    );

    // Hämta användaren (utan att krascha)
    const {
        data: { user }
    } = await event.locals.supabase.auth.getUser();

    event.locals.user = user;

    // Kör vidare
    return resolve(event);
};
