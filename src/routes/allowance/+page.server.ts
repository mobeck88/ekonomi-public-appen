import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { active: [], history: [] };

    const access_token = cookies.get('sb-access-token');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        }
    });

    // Aktiva perioder (end_month = null) för hushållet
    const { data: active } = await supabase
        .from('allowance')
        .select('*')
        .eq('household_id', householdId)
        .is('end_month', null)
        .order('start_month', { ascending: true });

    // Historik (end_month != null) för hushållet
    const { data: history } = await supabase
        .from('allowance')
        .select('*')
        .eq('household_id', householdId)
        .not('end_month', 'is', null)
        .order('start_month', { ascending: true });

    return {
        active: active ?? [],
        history: history ?? []
    };
};

export const actions: Actions = {
    create: async ({ request, locals, cookies }) => {
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

        const amount = Number(form.get('amount'));
        const start_raw = form.get('start_month'); // YYYY-MM
        const title = form.get('title');
        const description = form.get('description');

        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('allowance').insert({
            household_id: householdId,
            user_id: user.id,
            amount,
            start_month,
            end_month: null,
            title,
            description
            // allowance_group_id får default gen_random_uuid()
        });

        if (error) {
            return fail(400, { error: error.message });
        }

        return { success: true };
    },

    update: async ({ request, locals, cookies }) => {
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
        const group_id = form.get('allowance_group_id');
        const new_amount = Number(form.get('amount'));
        const new_start_raw = form.get('start_month');

        const new_start = `${new_start_raw}-01`;

        // Hämta aktiv period för gruppen inom hushållet
        const { data: active } = await supabase
            .from('allowance')
            .select('*')
            .eq('allowance_group_id', group_id)
            .eq('household_id', householdId)
            .is('end_month', null)
            .single();

        if (!active) {
            return fail(400, { error: 'Ingen aktiv period hittades.' });
        }

        // Sätt slutdatum på gamla perioden
        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        await supabase
            .from('allowance')
            .update({ end_month })
            .eq('id', active.id)
            .eq('household_id', householdId);

        // Skapa ny period i samma grupp och hushåll
        const { error: insertError } = await supabase.from('allowance').insert({
            household_id: householdId,
            user_id: user.id,
            allowance_group_id: group_id,
            amount: new_amount,
            start_month: new_start,
            end_month: null
        });

        if (insertError) {
            return fail(400, { error: insertError.message });
        }

        return { success: true };
    },

    end: async ({ request, locals, cookies }) => {
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
        const group_id = form.get('allowance_group_id');
        const end_raw = form.get('end_month');

        const end_month = `${end_raw}-01`;

        const { error } = await supabase
            .from('allowance')
            .update({ end_month })
            .eq('allowance_group_id', group_id)
            .eq('household_id', householdId)
            .is('end_month', null);

        if (error) {
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
