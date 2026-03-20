import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
    default: async ({ request, locals }) => {
        const data = await request.formData();
        const code = data.get('code');

        console.log("JOIN ACTION KÖRS, code:", code);

        if (!code || typeof code !== 'string') {
            return fail(400, { error: "Ingen kod angiven" });
        }

        // Hämta supabase-klienten
        const supabase = locals.supabase;
        const user = locals.user;

        if (!user) {
            return fail(401, { error: "Ingen användare inloggad" });
        }

        // Kontrollera att hushållet finns
        const { data: household, error: householdError } = await supabase
            .from('households')
            .select('id')
            .filter('join_code', 'eq', code)
            .maybeSingle();

        if (householdError) {
            console.error("Household error:", householdError);
            return fail(500, { error: "Fel vid hämtning av hushåll" });
        }

        if (!household) {
            return fail(400, { error: "Ogiltig hushållskod" });
        }

        // Lägg till användaren i hushållet — nu med loggning
        const { data: insertData, error: insertError } = await supabase
            .from('household_members')
            .insert({
                user_id: user.id,
                household_id: household.id
            })
            .select()
            .single();

        console.log("JOIN INSERT RESULT:", { insertData, insertError });

        if (insertError) {
            console.error("Insert error:", insertError);
            return fail(500, { error: "Kunde inte gå med i hushållet" });
        }

        console.log("JOIN OK → redirect till /");

        throw redirect(303, '/');
    }
};
