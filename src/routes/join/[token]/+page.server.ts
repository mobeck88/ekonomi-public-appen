import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;
    const token = params.token;

    if (!user) throw redirect(303, '/login');

    // Hitta hushåll via invite_token
    const { data: household } = await supabase
        .from('households')
        .select('id')
        .eq('invite_token', token)
        .maybeSingle();

    if (!household) {
        throw redirect(303, '/household?error=invalid_token');
    }

    // Kontrollera om användaren redan är medlem
    const { data: existingMember } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', household.id)
        .eq('user_id', user.id)
        .maybeSingle();

    // Om inte medlem → lägg till
    if (!existingMember) {
        await supabase.from('household_members').insert({
            household_id: household.id,
            user_id: user.id,
            role: 'member'
        });
    }

    // Klart → redirect
    throw redirect(303, '/household?joined=1');
};
