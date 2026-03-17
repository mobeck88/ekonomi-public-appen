import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;

    if (!user) throw redirect(303, '/login');

    const token = params.token;

    const { data: household } = await supabase
        .from('households')
        .select('id')
        .eq('join_code', token)
        .maybeSingle();

    if (!household) {
        return fail(400, { error: 'Hushåll hittades inte.' });
    }

    const { error } = await supabase
        .from('household_members')
        .insert({
            household_id: household.id,
            user_id: user.id,
            role: 'member'
        });

    if (error) {
        return fail(500, { error: 'Kunde inte lägga till dig i hushållet.' });
    }

    throw redirect(303, '/household');
};
