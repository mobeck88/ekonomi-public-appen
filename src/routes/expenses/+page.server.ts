import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;
    const userId = locals.user.id;

    const { data: active, error: activeError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .is('end_month', null)
        .order('start_month', { ascending: true });

    if (activeError) {
        console.error('load expenses active error', activeError);
    }

    const { data: history, error: historyError } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .not('end_month', 'is', null)
        .order('start_month', { ascending: true });

    if (historyError) {
        console.error('load expenses history error', historyError);
    }

    return { active, history };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;
        const userId = locals.user.id;

        const form = await request.formData();

        const title = form.get('title') as string;
        const description = (form.get('description') as string) || null;
        const amount = Number(form.get('amount'));
        const interval = Number(form.get('interval_months'));
        const owner = form.get('owner') as string; // 'A', 'H', 'A+H'
        const start_raw = form.get('start_month') as string; // YYYY-MM

        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('expenses').insert({
            user_id: userId,
            title,
            description,
            amount,
            interval_months: interval,
            owner,
            start_month,
            end_month: null
            // expense_group_id antas ha default i databasen (t.ex. gen_random_uuid())
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
        const userId = locals.user.id;

        const form = await request.formData();
        const group_id = form.get('expense_group_id') as string;
        const new_amount = Number(form.get('amount'));
        const new_interval = Number(form.get('interval_months'));
        const new_owner = form.get('owner') as string;
        const new_start_raw = form.get('start_month') as string;

        const new_start = `${new_start_raw}-01`;

        const { data: active, error: activeError } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .eq('expense_group_id', group_id)
            .is('end_month', null)
            .single();

        if (activeError) {
            console.error('update expense load active error', activeError);
        }

        if (!active) {
            return fail(400, { error: 'Ingen aktiv period hittades' });
        }

        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        const { error: endError } = await supabase
            .from('expenses')
            .update({ end_month })
            .eq('user_id', userId)
            .eq('id', active.id);

        if (endError) {
            console.error('update expense end current error', endError);
            return fail(400, { error: endError.message });
        }

        const { error: insertError } = await supabase.from('expenses').insert({
            user_id: userId,
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
            console.error('update expense insert new error', insertError);
            return fail(400, { error: insertError.message });
        }

        return { success: true };
    },

    end: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;
        const userId = locals.user.id;

        const form = await request.formData();
        const group_id = form.get('expense_group_id') as string;
        const end_raw = form.get('end_month') as string;

        const end_month = `${end_raw}-01`;

        const { error } = await supabase
            .from('expenses')
            .update({ end_month })
            .eq('user_id', userId)
            .eq('expense_group_id', group_id)
            .is('end_month', null);

        if (error) {
            console.error('end expense error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
