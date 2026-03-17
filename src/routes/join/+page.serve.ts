import { redirect, fail } from '@sveltejs/kit';
import type { Actions } from './$types';

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

        if (error) return fail(500, { error: 'Kunde inte lägga till dig i hushållet.' });

        throw redirect(303, '/household');
    }
};
