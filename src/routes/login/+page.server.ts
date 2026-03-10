import { fail, redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/auth-helpers-sveltekit';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const actions = {
    default: async ({ request, cookies }) => {
        const form = await request.formData();
        const email = form.get('email') as string;
        const password = form.get('password') as string;

        // ⭐ Skapa Supabase-serverklient med cookie-stöd
        const supabase = createServerClient(
            SUPABASE_URL,
            SUPABASE_ANON_KEY,
            {
                cookies: {
                    getAll: () => {
                        return cookies.getAll().map((c) => ({
                            name: c.name,
                            value: c.value
                        }));
                    },
                    setAll: (newCookies) => {
                        newCookies.forEach((cookie) => {
                            cookies.set(cookie.name, cookie.value, {
                                path: '/',
                                httpOnly: true,
                                sameSite: 'lax',
                                secure: true
                            });
                        });
                    }
                }
            }
        );

        // ⭐ Logga in
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error || !data.session) {
            return fail(400, { error: error?.message ?? 'Fel vid inloggning' });
        }

        const session = data.session;

        // ⭐ Hämta household_id
        const { data: householdMember } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', session.user.id)
            .single();

        if (!householdMember) {
            throw redirect(303, '/setup-household');
        }

        // ⭐ Spara household_id i cookie
        cookies.set('household_id', householdMember.household_id, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true,
            maxAge: 60 * 60 * 24 * 30
        });

        // ⭐ Redirect till dashboard
        throw redirect(303, '/budget');
    }
};
