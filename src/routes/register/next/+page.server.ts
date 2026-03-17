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
        await supabase.from('profiles').insert({
            id: user.id,
            full_name: user.user_metadata?.full_name ?? null
        });
    }

    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (membership?.household_id) {
        throw redirect(303, '/household');
    }

    return {};
};

export const actions: Actions = {
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
