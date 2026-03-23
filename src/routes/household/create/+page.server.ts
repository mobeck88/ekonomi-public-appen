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

        // Hämta namn på ett robust sätt
        const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'Användare';

        const householdName = `${fullName}s hushåll`;

        // ⭐ 1. Skapa profil om den saknas (men aldrig ensam)
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                full_name: fullName
            });

        if (profileError) {
            console.error('Profile create error:', profileError);
            return fail(500, { error: 'Kunde inte skapa profil.' });
        }

        // ⭐ 2. Skapa hushållet
        const { data: household, error: householdError } = await supabase
            .from('households')
            .insert({
                name: householdName,
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

        // ⭐ 3. Lägg till användaren som owner (nu finns profil → FK OK)
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

        // ⭐ 4. Redirect till hushållssidan
        throw redirect(303, '/household');
    }
};
