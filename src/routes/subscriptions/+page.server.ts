import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    const { data: active } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', locals.user.id)
        .is('end_month', null)
        .order('start_month', { ascending: true });

    const { data: history } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', locals.user.id)
        .not('end_month', 'is', null)
        .order('start_month', { ascending: true });

    return { active, history };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();

        const amount = Number(form.get('amount'));
        const start_month_raw = form.get('start_month'); // YYYY-MM
        const title = form.get('title');
        const description = form.get('description');

        // FIX: Konvertera YYYY-MM → YYYY-MM-01
        const start_month = `${start_month_raw}-01`;

        const { error } = await supabase.from('subscriptions').insert({
            user_id: locals.user.id,
            amount,
            start_month,
            end_month: null,
            title,
            description
        });

        if (error) {
            console.error('create subscription error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    },

    update: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();
        const group_id = form.get('subscription_group_id');
        const new_amount = Number(form.get('amount'));
        const new_start_raw = form.get('start_month');

        // FIX: YYYY-MM → YYYY-MM-01
        const new_start = `${new_start_raw}-01`;

        const { data: active } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('subscription_group_id', group_id)
            .eq('user_id', locals.user.id)
            .is('end_month', null)
            .single();

        if (!active) return fail(400, { error: 'Ingen aktiv period hittades' });

        const end_month_date = new Date(new_start);
        end_month_date.setMonth(end_month_date.getMonth() - 1);
        const end_month = end_month_date.toISOString().slice(0, 10);

        await supabase
            .from('subscriptions')
            .update({ end_month })
            .eq('id', active.id);

        await supabase.from('subscriptions').insert({
            user_id: locals.user.id,
            subscription_group_id: group_id,
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
        const group_id = form.get('subscription_group_id');
        const end_month_raw = form.get('end_month');

        // FIX: YYYY-MM → YYYY-MM-01
        const end_month = `${end_month_raw}-01`;

        await supabase
            .from('subscriptions')
            .update({ end_month })
            .eq('subscription_group_id', group_id)
            .eq('user_id', locals.user.id)
            .is('end_month', null);

        return { success: true };
    }
};
