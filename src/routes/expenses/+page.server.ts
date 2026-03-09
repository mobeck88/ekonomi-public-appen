import { fail, redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { active: [], history: [], members: [] };

    const access_token = cookies.get('sb-access-token');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        }
    });

    // ⭐ Hämta aktiva utgifter
    const { data: active } = await supabase
        .from('expenses')
        .select('*')
        .eq('household_id', householdId)
        .is('end_month', null)
        .order('start_month', { ascending: true });

    // ⭐ Hämta historik
    const { data: history } = await supabase
        .from('expenses')
        .select('*')
        .eq('household_id', householdId)
        .not('end_month', 'is', null)
        .order('start_month', { ascending: true });

    // ⭐ Hämta hushållets medlemmar + namn
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id, profiles(full_name)')
        .eq('household_id', householdId);

    return {
        active: active ?? [],
        history: history ?? [],
        members: members ?? []
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

        const title = form.get('title');
        const description = form.get('description');
        const amount = Number(form.get('amount'));
        const interval = Number(form.get('interval_months'));
        const owner = form.get('owner'); // ⭐ user_id eller "shared"
        const start_raw = form.get('start_month');

        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('expenses').insert({
            household_id: householdId,
            title,
            description,
            amount,
            interval_months: interval,
            owner,
            start_month,
            end_month: null
        });

        if (error) {
            console.error('create expense error', error);
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
        const group_id = form.get('expense_group_id');
        const new_amount = Number(form.get('amount'));
        const new_interval = Number(form.get('interval_months'));
        const new_owner = form.get('owner');
        const new_start_raw = form.get('start_month');

        const new_start = `${new_start_raw}-01`;

        // ⭐ Hämta aktiv period
        const { data: active } = await supabase
            .from('expenses')
            .select('*')
            .eq('expense_group_id', group_id)
            .eq('household_id', householdId)
            .is('end_month', null)
            .single();

        if (!active) return fail(400, { error: 'Ingen aktiv period hittades' });

        // ⭐ Avsluta gamla perioden
        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        await supabase
            .from('expenses')
            .update({ end_month })
            .eq('id', active.id)
            .eq('household_id', householdId);

        // ⭐ Skapa ny period
        const { error: insertError } = await supabase.from('expenses').insert({
            household_id: householdId,
            expense_group_id: group_id,
            title: active.title,
            description: active.description,
            amount: new_amount,
            interval_months: new_interval,
            owner: new_owner,
            start_month: new_start,
            end_month: null
        });

        if (insertError) {
            console.error('insert new expense period error', insertError);
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
        const group_id = form.get('expense_group_id');
        const end_raw = form.get('end_month');

        const end_month = `${end_raw}-01`;

        const { error } = await supabase
            .from('expenses')
            .update({ end_month })
            .eq('expense_group_id', group_id)
            .eq('household_id', householdId)
            .is('end_month', null);

        if (error) {
            console.error('end expense error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
