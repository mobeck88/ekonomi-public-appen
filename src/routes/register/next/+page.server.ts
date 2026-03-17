import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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
