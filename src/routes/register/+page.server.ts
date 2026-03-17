import { redirect, fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (locals.user) throw redirect(303, '/budget');
    return {};
};

export const actions: Actions = {
    default: async ({ request }) => {
        const form = await request.formData();

        const email = form.get('email') as string;
        const password = form.get('password') as string;
        const full_name = form.get('name') as string;

        if (!email || !password || !full_name) {
            return fail(400, { error: 'Alla fält måste fyllas i.' });
        }

        const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const { error: signUpError } = await anon.auth.signUp({
            email,
            password,
            options: {
                data: { full_name },
                emailRedirectTo: 'https://ekonomi-public-appen.vercel.app/register/next'
            }
        });

        if (signUpError) {
            return fail(400, { error: signUpError.message });
        }

        throw redirect(303, '/register/verify-email');
    }
};
