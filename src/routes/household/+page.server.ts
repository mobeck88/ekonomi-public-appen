import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load = async ({ locals }) => {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const user = locals.user;

    if (!user) {
        return { user: null, householdId: null, role: null };
    }

    const { data: memberships, error } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', user.id)
        .limit(1);

    if (error || !memberships || memberships.length === 0) {
        return { user, householdId: null, role: null };
    }

    return {
        user,
        householdId: memberships[0].household_id,
        role: memberships[0].role
    };
};

export const actions = {
    join: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) {
            return fail(401, { error: 'Du måste vara inloggad.' });
        }

        const form = await request.formData();
        const code = form.get('code') as string;

        if (!code) {
            return fail(400, { error: 'Du måste ange en hushållskod.' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // Kontrollera att hushållet finns
        const { data: household, error: householdError } = await supabase
            .from('households')
            .select('id')
            .eq('id', code)
            .single();

        if (householdError || !household) {
            return fail(404, { error: 'Hushåll hittades inte.' });
        }

        // Lägg till användaren som member
        const { error: memberError } = await supabase.from('household_members').insert({
            household_id: household.id,
            user_id: user.id,
            role: 'member'
        });

        if (memberError) {
            return fail(500, { error: 'Kunde inte gå med i hushållet.' });
        }

        return { success: true };
    }
};
