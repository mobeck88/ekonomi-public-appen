import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;
    const token = params.token;

    if (!user) throw redirect(303, '/login');

    const { data: household } = await supabase
        .from('households')
        .select('id')
        .eq('invite_token', token)
        .single();

    if (!household) {
        throw redirect(303, '/household?error=invalid_token');
    }

    await supabase.from('household_members').insert({
        household_id: household.id,
        user_id: user.id,
        role: 'member'
    });

    throw redirect(303, '/household?joined=1');
};
