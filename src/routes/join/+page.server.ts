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

        const { data: insertData, error: insertError } = await supabase
            .from('household_members')
            .insert({
                user_id: user.id,
                household_id: household.id,
                role: role   // ← SÄTTER ROLLEN DIREKT
            })
            .select()
            .single();

        if (insertError) {
            console.error("Insert error:", insertError);
            return fail(500, { error: "Kunde inte gå med i hushållet" });
        }

        throw redirect(303, '/');
    }
};
