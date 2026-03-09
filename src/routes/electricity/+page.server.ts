import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { entries: [] };

    const access_token = cookies.get('sb-access-token');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        }
    });

    const { data, error } = await supabase
        .from('electricity')
        .select('*')
        .eq('household_id', householdId)
        .order('month', { ascending: false });

    if (error) {
        console.error('Load electricity error:', error);
        return { entries: [] };
    }

    return { entries: data ?? [] };
};

export const actions: Actions = {
    save: async ({ request, locals, cookies }) => {
        const user = locals.user;
        const householdId = locals.householdId;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const access_token = cookies.get('sb-access-token');

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            }
        });

        const form = await request.formData();

        const month_raw = form.get('month'); // YYYY-MM
        const eon_amount = Number(form.get('eon_amount'));
        const tibber_amount = Number(form.get('tibber_amount'));

        if (!month_raw) {
            return fail(400, { error: 'Månad saknas' });
        }

        const month = `${month_raw}-01`;

        // Finns redan?
        const { data: existing, error: selectError } = await supabase
            .from('electricity')
            .select('*')
            .eq('household_id', householdId)
            .eq('month', month)
            .maybeSingle();

        if (selectError) {
            console.error('Select electricity error:', selectError);
            return fail(400, { error: selectError.message });
        }

        if (existing) {
            // Uppdatera
            const { error } = await supabase
                .from('electricity')
                .update({ eon_amount, tibber_amount })
                .eq('id', existing.id)
                .eq('household_id', householdId);

            if (error) {
                console.error('Update electricity error:', error);
                return fail(400, { error: error.message });
            }
        } else {
            // Skapa ny rad
            const { error } = await supabase
                .from('electricity')
                .insert({
                    household_id: householdId,
                    month,
                    eon_amount,
                    tibber_amount
                });

            if (error) {
                console.error('Insert electricity error:', error);
                return fail(400, { error: error.message });
            }
        }

        throw redirect(303, '/electricity');
    }
};
