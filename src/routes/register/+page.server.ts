import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const actions = {
    default: async ({ request }) => {
        const form = await request.formData();
        const email = form.get('email') as string;
        const password = form.get('password') as string;
        const name = form.get('name') as string | null;

        if (!email || !password) {
            return fail(400, { error: 'E‑post och lösenord krävs.' });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // 1. Skapa användare
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password
        });

        if (signUpError || !signUpData.user) {
            return fail(400, { error: signUpError?.message ?? 'Kunde inte skapa konto.' });
        }

        const userId = signUpData.user.id;

        // 2. Skapa hushåll
        const householdName = name || 'Mitt hushåll';

        const { data: householdData, error: householdError } = await supabase
            .from('households')
            .insert({
                name: householdName
            })
            .select('id')
            .single();

        if (householdError || !householdData) {
            return fail(500, { error: 'Kunde inte skapa hushåll.' });
        }

        const householdId = householdData.id;

        // 3. Lägg till användaren som owner i household_members
        const { error: memberError } = await supabase.from('household_members').insert({
            household_id: householdId,
            user_id: userId,
            role: 'owner'
        });

        if (memberError) {
            return fail(500, { error: 'Kunde inte koppla användare till hushåll.' });
        }

        // 4. Tillbaka till login (användaren loggar in efter att ha bekräftat mail)
        throw redirect(303, '/login');
    }
};
