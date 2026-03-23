import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const data = await request.formData();
        const code = data.get('code');
        const role = data.get('role');

        console.log("JOIN ACTION KÖRS, code:", code, "role:", role);

        if (!code || typeof code !== 'string') {
            return fail(400, { error: "Ingen kod angiven" });
        }

        if (!role || (role !== 'member' && role !== 'guardian')) {
            return fail(400, { error: "Ogiltig roll" });
        }

        const trimmedCode = code.trim();
        const supabase = locals.supabase;
        const user = locals.user;

        if (!user) {
            return fail(401, { error: "Ingen användare inloggad" });
        }

        // ⭐ 1. Hämta hushållet via join-kod
        const { data: household, error: householdError } = await supabase
            .from('households')
            .select('id, join_code')
            .eq('join_code', trimmedCode)
            .maybeSingle();

        if (householdError) {
            console.error("Household error:", householdError);
            return fail(500, { error: "Fel vid hämtning av hushåll" });
        }

        if (!household) {
            return fail(400, { error: "Ogiltig hushållskod" });
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
            return fail(500, { error: "Kunde inte skapa profil." });
        }

        // ⭐ 3. Lägg till användaren i hushållet
        const { error: insertError } = await supabase
            .from('household_members')
            .insert({
                user_id: user.id,
                household_id: household.id,
                role: role,
                guardian_for: false
            });

        if (insertError) {
            console.error("Insert error:", insertError);
            return fail(500, { error: "Kunde inte gå med i hushållet" });
        }

        // ⭐ 4. Klart — användaren har nu profil + hushåll
        throw redirect(303, '/');
    }
};
