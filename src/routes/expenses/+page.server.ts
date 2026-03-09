import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    const { data: active, error: activeError } = await supabase
        .from('expenses')
        .select('*')
        .is('end_month', null)
        .order('start_month', { ascending: true });

    if (activeError) {
        console.error('load active expenses error', activeError);
        throw fail(500, { error: activeError.message });
    }

    const { data: history, error: historyError } = await supabase
        .from('expenses')
        .select('*')
        .not('end_month', 'is', null)
        .order('start_month', { ascending: true });

    if (historyError) {
        console.error('load history expenses error', historyError);
        throw fail(500, { error: historyError.message });
    }

    return { active, history };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();

        const title = form.get('title');
        const description = form.get('description');
        const amount = Number(form.get('amount'));
        const interval = Number(form.get('interval_months'));
        const owner = form.get('owner');
        const start_raw = form.get('start_month');

        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('expenses').insert({
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

    update: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();
        const group_id = form.get('expense_group_id');
        const new_amount = Number(form.get('amount'));
        const new_interval = Number(form.get('interval_months'));
        const new_owner = form.get('owner');
        const new_start_raw = form.get('start_month');

        const new_start = `${new_start_raw}-01`;

        const { data: active, error: activeError } = await supabase
            .from('expenses')
            .select('*')
            .eq('expense_group_id', group_id)
            .is('end_month', null)
            .single();

        if (activeError || !active) {
            console.error('fetch active expense for update error', activeError);
            return fail(400, { error: 'Ingen aktiv period hittades' });
        }

        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        const { error: endError } = await supabase
            .from('expenses')
            .update({ end_month })
            .eq('id', active.id);

        if (endError) {
            console.error('end current expense period error', endError);
            return fail(400, { error: endError.message });
        }

        const { error: insertError } = await supabase.from('expenses').insert({
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

    end: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();
        const group_id = form.get('expense_group_id');
        const end_raw = form.get('end_month');

        const end_month = `${end_raw}-01`;

        const { error } = await supabase
            .from('expenses')
            .update({ end_month })
            .eq('expense_group_id', group_id)
            .is('end_month', null);

        if (error) {
            console.error('end expense error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
