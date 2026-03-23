import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;

    if (!user) throw redirect(303, '/login');

    const token = params.token;

    const { data: household, error: householdError } = await supabase
        .from('households')
        .select('id')
        .eq('join_code', token)
        .maybeSingle();

    if (householdError) {
        console.error("Household lookup error:", householdError);
        return { error: 'Fel vid hämtning av hushåll.' };
    }

    if (!household) {
        return { error: 'Hushåll hittades inte.' };
    }

    return { household };
};

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        const supabase = locals.supabase;
        const user = locals.user;

        if (!user) return fail(401, { error: 'Ingen användare inloggad.' });

        const form = await request.formData();
        const role = form.get('role');

        if (!role || (role !== 'member' && role !== 'guardian')) {
            return fail(400, { error: 'Ogiltig roll.' });
        }

        const token = params.token;

        // ⭐ 1. Hämta hushållet via token
        const { data: household, error: householdError } = await supabase
            .from('households')
            .select('id')
            .eq('join_code', token)
            .maybeSingle();

        if (householdError) {
            console.error("Household lookup error:", householdError);
            return fail(500, { error: 'Fel vid hämtning av hushåll.' });
        }

        if (!household) {
            return fail(400, { error: 'Hushåll hittades inte.' });
        }

        // ⭐ 2. Skapa profil om den saknas (men aldrig ensam)
        const fullName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'Användare';

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id,
                full_name: fullName
            });

        if (profileError) {
            console.error("Profile create error:", profileError);
            return fail(500, { error: 'Kunde inte skapa profil.' });
        }

        // ⭐ 3. Lägg till användaren i hushållet
        const { error: memberError } = await supabase
            .from('household_members')
            .insert({
                household_id: household.id,
                user_id: user.id,
                role,
                guardian_for: false
            });

        if (memberError) {
            console.error("Household member insert error:", memberError);
            return fail(500, { error: 'Kunde inte lägga till dig i hushållet.' });
        }

        // ⭐ 4. Klart — användaren har nu profil + hushåll
        throw redirect(303, '/household');
    }
};
