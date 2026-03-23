import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;

    if (!user) {
        throw redirect(303, '/login');
    }

    return {};
};

export const actions: Actions = {
    default: async ({ locals }) => {
        const supabase = locals.supabase;
        const user = locals.user;

        if (!user) {
            return fail(401, { error: 'Ingen användare inloggad.' });
        }

        // 1. Skapa hushållet (LÅT join_code DEFAULT GENERERAS AUTOMATISKT)
        const { data: household, error: householdError } = await supabase
            .from('households')
            .insert({
                adults: 0,
                children: 0,
                enable_assistance: false
            })
            .select()
            .single();

        if (householdError) {
            console.error('Household create error:', householdError);
            return fail(500, { error: 'Kunde inte skapa hushåll.' });
        }

        // 2. Lägg till användaren som owner
        const { error: memberError } = await supabase
            .from('household_members')
            .insert({
                user_id: user.id,
                household_id: household.id,
                role: 'owner',
                guardian_for: false
            });

        if (memberError) {
            console.error('Owner insert error:', memberError);
            return fail(500, { error: 'Kunde inte lägga till ägare.' });
        }

        // 3. Redirect till hushållssidan
        throw redirect(303, '/household');
    }
};
