import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;

    if (!user) throw redirect(303, '/login');

    // Säkerställ att profil finns
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

    // Kolla om användaren redan tillhör ett hushåll
    const { data: membership, error: membershipError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();

    if (membershipError) {
        console.error('Membership lookup error:', membershipError);
    }

    if (membership?.household_id) {
        // Användaren är redan med i ett hushåll → skicka till hushållssidan
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

        if (code.length === 0) {
            return fail(400, { error: 'Du måste ange en hushållskod.' });
        }

        // Hitta hushåll via join_code
        const { data: household, error: selectError } = await supabase
            .from('households')
            .select('id')
            .eq('join_code', code)
            .maybeSingle();

        if (selectError) {
            console.error('Join select error:', selectError);
        }

        if (!household) {
            return fail(400, { error: 'Hushåll hittades inte.' });
        }

        // Kontrollera om användaren redan är medlem
        const { data: existingMember, error: existingError } = await supabase
            .from('household_members')
            .select('id')
            .eq('household_id', household.id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingError) {
            console.error('Existing member lookup error:', existingError);
        }

        if (!existingMember) {
            const { error: memberError } = await supabase.from('household_members').insert({
                household_id: household.id,
                user_id: user.id,
                role: 'member'
            });

            if (memberError) {
                console.error('Member insert error:', memberError);
                return fail(500, { error: 'Kunde inte gå med i hushållet.' });
            }
        }

        throw redirect(303, '/household');
    },

    create: async ({ locals }) => {
        const supabase = locals.supabase;
        const user = locals.user;

        if (!user) throw redirect(303, '/login');

        // Skapa hushåll
        const { data: newHousehold, error: householdError } = await supabase
            .from('households')
            .insert({
                adults: 1,
                children: 0
            })
            .select('id')
            .single();

        if (householdError || !newHousehold) {
            console.error('Household creation error:', householdError);
            return fail(500, { error: 'Kunde inte skapa hushåll.' });
        }

        // Lägg till användaren som owner
        const { error: memberError } = await supabase.from('household_members').insert({
            household_id: newHousehold.id,
            user_id: user.id,
            role: 'owner'
        });

        if (memberError) {
            console.error('Owner insert error:', memberError);
            return fail(500, { error: 'Kunde inte lägga till dig i hushållet.' });
        }

        throw redirect(303, '/household');
    }
};
