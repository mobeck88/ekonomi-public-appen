import { redirect, fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (locals.user) throw redirect(303, '/budget');
    return {};
};

export const actions: Actions = {
    // SIGNUP
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
    },

    // JOIN HOUSEHOLD (flyttad hit)
    join: async ({ request, locals }) => {
        const supabase = locals.supabase;
        const user = locals.user;

        if (!user) throw redirect(303, '/login');

        const form = await request.formData();
        let code = form.get('code');

        if (!code || typeof code !== 'string') {
            return fail(400, { error: 'Du måste ange en hushållskod.' });
        }

        code = code.trim();

        if (code.length === 0) {
            return fail(400, { error: 'Du måste ange en hushållskod.' });
        }

        const { data: household } = await supabase
            .from('households')
            .select('id')
            .eq('join_code', code)
            .maybeSingle();

        if (!household) {
            return fail(400, { error: 'Hushåll hittades inte.' });
        }

        const { data: existingMember } = await supabase
            .from('household_members')
            .select('id')
            .eq('household_id', household.id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (!existingMember) {
            const { error: memberError } = await supabase.from('household_members').insert({
                household_id: household.id,
                user_id: user.id,
                role: 'member'
            });

            if (memberError) {
                return fail(500, { error: 'Kunde inte gå med i hushållet.' });
            }
        }

        throw redirect(303, '/household');
    },

    // CREATE HOUSEHOLD (flyttad hit)
    create: async ({ locals }) => {
        const supabase = locals.supabase;
        const user = locals.user;

        if (!user) throw redirect(303, '/login');

        const { data: newHousehold, error: householdError } = await supabase
            .from('households')
            .insert({
                adults: 1,
                children: 0
            })
            .select('id')
            .single();

        if (householdError || !newHousehold) {
            return fail(500, { error: 'Kunde inte skapa hushåll.' });
        }

        const { error: memberError } = await supabase.from('household_members').insert({
            household_id: newHousehold.id,
            user_id: user.id,
            role: 'owner'
        });

        if (memberError) {
            return fail(500, { error: 'Kunde inte lägga till dig i hushållet.' });
        }

        throw redirect(303, '/household');
    }
};
