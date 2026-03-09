import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load = async ({ locals, cookies }) => {
    const user = locals.user;
    if (!user) return { user: null, householdId: null, role: null };

    const access_token = cookies.get('sb-access-token');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        }
    });

    const { data: membership } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', user.id)
        .maybeSingle();

    return {
        user,
        householdId: membership?.household_id ?? null,
        role: membership?.role ?? null
    };
};

export const actions = {
    join: async ({ request, locals, cookies }) => {
        const user = locals.user;
        if (!user) return fail(401, { error: 'Du måste vara inloggad.' });

        const form = await request.formData();
        const code = form.get('code');

        const access_token = cookies.get('sb-access-token');

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            }
        });

        const { data: household } = await supabase
            .from('households')
            .select('id')
            .eq('id', code)
            .maybeSingle();

        if (!household) return fail(404, { error: 'Hushåll hittades inte.' });

        const { error } = await supabase.from('household_members').insert({
            household_id: household.id,
            user_id: user.id,
            role: 'member'
        });

        if (error) return fail(500, { error: 'Kunde inte gå med i hushållet.' });

        return { success: true };
    }
};
