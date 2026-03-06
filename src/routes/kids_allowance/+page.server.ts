import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    const { data: active } = await supabase
        .from('kids_allowance')
        .select('*')
        .is('end_month', null)
        .order('child_name', { ascending: true })
        .order('start_month', { ascending: true });

    const { data: history } = await supabase
        .from('kids_allowance')
        .select('*')
        .not('end_month', 'is', null)
        .order('child_name', { ascending: true })
        .order('start_month', { ascending: true });

    return { active, history };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();

        const child_name = form.get('child_name');
        const amount = Number(form.get('amount'));
        const start_raw = form.get('start_month');
        const title = form.get('title');
        const description = form.get('description');

        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('kids_allowance').insert({
            child_name,
            amount,
            start_month,
            end_month: null,
            title,
            description
        });

        if (error) {
            console.error('create kids allowance error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    },

    update: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();
        const group_id = form.get('kids_group_id');
        const new_amount = Number(form.get('amount'));
        const new_start_raw = form.get('start_month');

        const new_start = `${new_start_raw}-01`;

        const { data: active } = await supabase
            .from('kids_allowance')
            .select('*')
            .eq('kids_group_id', group_id)
            .is('end_month', null)
            .single();

        if (!active) return fail(400, { error: 'Ingen aktiv period hittades' });

        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        await supabase
            .from('kids_allowance')
            .update({ end_month })
            .eq('id', active.id);

        await supabase.from('kids_allowance').insert({
            kids_group_id: group_id,
            child_name: active.child_name,
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
        const group_id = form.get('kids_group_id');
        const end_raw = form.get('end_month');

        const end_month = `${end_raw}-01`;

        await supabase
            .from('kids_allowance')
            .update({ end_month })
            .eq('kids_group_id', group_id)
            .is('end_month', null);

        return { success: true };
    }
};
