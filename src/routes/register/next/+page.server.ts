import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;

    if (!user) throw redirect(303, '/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

    if (!profile) {
        const { error: profileError } = await supabase.from('profiles').insert({
            id: user.id,
            full_name: user.user_metadata?.full_name ?? null
        });

        if (profileError) {
            console.error('Profile creation error:', profileError);
        }
    }

    return {};
};

export const actions: Actions = {
    join: async ({ request, locals }) => {
        const supabase = locals.supabase;
        const user = locals.user;

        if (!user) throw redirect(303, '/login');

        const form = await request.formData();
        const code = form.get('code');

        if (!code) {
            return fail(400, { error: 'Du måste ange en hushållskod.' });
        }

        const { data: household } = await supabase
            .from('households')
            .select('id')
            .eq('id', code)
            .single();

        if (!household) {
            return fail(400, { error: 'Hushåll hittades inte.' });
        }

        const { error: memberError } = await supabase.from('household_members').insert({
            household_id: household.id,
            user_id: user.id,
            role: 'member'
        });

        if (memberError) {
            return fail(500, { error: 'Kunde inte gå med i hushållet.' });
        }

        throw redirect(303, '/household');
    },

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

        if (householdError) {
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
