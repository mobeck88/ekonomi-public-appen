import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    // Hämta alla utgifter för användaren, sorterade
    const { data: all, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', locals.user.id)
        .order('start_month', { ascending: true });

    if (error) {
        console.error('LOAD EXPENSES ERROR:', error);
        return { active: [], history: [] };
    }

    const active = all?.filter((e) => e.end_month === null) ?? [];
    const history = all?.filter((e) => e.end_month !== null) ?? [];

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

        const rawStart = form.get('start_month') as string | null;
        const start_month = rawStart ? `${rawStart}-01` : null;

        const { error } = await supabase.from('expenses').insert({
            user_id: locals.user.id,
            title,
            description,
            amount,
            interval_months: interval,
            owner,
            start_month,
            end_month: null
        });

        if (error) {
            console.error('CREATE EXPENSE ERROR:', error);
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

        const rawStart = form.get('start_month') as string | null;
        const new_start = rawStart ? `${rawStart}-01` : null;

        const { data: active, error: activeError } = await supabase
            .from('expenses')
            .select('*')
            .eq('expense_group_id', group_id)
            .eq('user_id', locals.user.id)
            .is('end_month', null)
            .single();

        if (activeError || !active) {
            console.error('UPDATE FETCH ACTIVE ERROR:', activeError);
            return fail(400, { error: 'Ingen aktiv period hittades' });
        }

        const end_date = new Date(new_start!);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        await supabase
            .from('expenses')
            .update({ end_month })
            .eq('id', active.id);

        const { error } = await supabase.from('expenses').insert({
            user_id: locals.user.id,
            expense_group_id: group_id,
            title: active.title,
            description: active.description,
            amount: new_amount,
            interval_months: new_interval,
            owner: new_owner,
            start_month: new_start,
            end_month: null
        });

        if (error) {
            console.error('UPDATE EXPENSE ERROR:', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    },

    end: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();
        const group_id = form.get('expense_group_id');

        const rawEnd = form.get('end_month') as string | null;
        const end_month = rawEnd ? `${rawEnd}-01` : null;

        const { error } = await supabase
            .from('expenses')
            .update({ end_month })
            .eq('expense_group_id', group_id)
            .eq('user_id', locals.user.id)
            .is('end_month', null);

        if (error) {
            console.error('END EXPENSE ERROR:', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
