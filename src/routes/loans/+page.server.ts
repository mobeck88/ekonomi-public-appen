import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    const { data: active } = await supabase
        .from('loans')
        .select('*')
        .is('end_month', null)
        .order('loan_name', { ascending: true });

    const { data: history } = await supabase
        .from('loans')
        .select('*')
        .not('end_month', 'is', null)
        .order('loan_name', { ascending: true })
        .order('start_month', { ascending: true });

    return { active, history };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();

        const loan_name = form.get('loan_name');
        const reference = form.get('reference');
        const amount = Number(form.get('amount'));
        const start_raw = form.get('start_month');

        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('loans').insert({
            loan_name,
            reference,
            amount,
            start_month,
            end_month: null
        });

        if (error) {
            console.error('create loan error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    },

    update: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();
        const group_id = form.get('loan_group_id');
        const new_amount = Number(form.get('amount'));
        const new_start_raw = form.get('start_month');

        const new_start = `${new_start_raw}-01`;

        const { data: active } = await supabase
            .from('loans')
            .select('*')
            .eq('loan_group_id', group_id)
            .is('end_month', null)
            .single();

        if (!active) return fail(400, { error: 'Ingen aktiv period hittades' });

        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        await supabase
            .from('loans')
            .update({ end_month })
            .eq('id', active.id);

        await supabase.from('loans').insert({
            loan_group_id: group_id,
            loan_name: active.loan_name,
            reference: active.reference,
            amount: new_amount,
            start_month: new_start,
            end_month: null
        });

        return { success: true };
    },

    end: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();
        const group_id = form.get('loan_group_id');
        const end_raw = form.get('end_month');

        const end_month = `${end_raw}-01`;

        await supabase
            .from('loans')
            .update({ end_month })
            .eq('loan_group_id', group_id)
            .is('end_month', null);

        return { success: true };
    }
};
