import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;
    const rawCode = params.token; // join_code från URL: /join/xxxxxxx

    if (!user) throw redirect(303, '/login');

    const code = (rawCode ?? '').trim();

    if (!code) {
        throw redirect(303, '/household?error=invalid_code');
    }

    // Hitta hushåll via join_code
    const { data: household, error: selectError } = await supabase
        .from('households')
        .select('id')
        .eq('join_code', code)
        .maybeSingle();

    if (selectError) {
        console.error('Join via URL select error:', selectError);
    }

    if (!household) {
        throw redirect(303, '/household?error=invalid_code');
    }

    // Kontrollera om användaren redan är medlem
    const { data: existingMember, error: existingError } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', household.id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (existingError) {
        console.error('Existing member lookup error (URL join):', existingError);
    }

    // Om inte medlem → lägg till
    if (!existingMember) {
        const { error: insertError } = await supabase.from('household_members').insert({
            household_id: household.id,
            user_id: user.id,
            role: 'member'
        });

        if (insertError) {
            console.error('Member insert error (URL join):', insertError);
            return fail(500, { error: 'Kunde inte gå med i hushållet.' });
        }
    }

    // Klart → redirect
    throw redirect(303, '/household?joined=1');
};
