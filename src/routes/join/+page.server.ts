import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;

    if (!user) throw redirect(303, '/login');

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

        const formData = await request.formData();
        const code = String(formData.get('code') ?? '').trim();

        if (!code) return fail(400, { error: 'Du måste ange en hushållskod.' });

        const { data: household } = await supabase
            .from('households')
            .select('id')
            .eq('join_code', code)
            .maybeSingle();

        if (!household) return fail(400, { error: 'Hushåll hittades inte.' });

        const { error } = await supabase
            .from('household_members')
            .insert({
                household_id: household.id,
                user_id: user.id,
                role: 'member'
            });

        if (error) return fail(500, { error: 'Kunde inte gå med i hushållet.' });

        throw redirect(303, '/household');
    }
};
