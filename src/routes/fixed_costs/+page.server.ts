import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    // ⭐ HÄMTA ALLA AKTIVA KOSTNADER (inte per användare)
    const { data: active } = await supabase
        .from('fixed_costs')
        .select('*')
        .is('end_month', null)
        .order('cost_name', { ascending: true });

    // ⭐ HÄMTA ALL HISTORIK (inte per användare)
    const { data: history } = await supabase
        .from('fixed_costs')
        .select('*')
        .not('end_month', 'is', null)
        .order('cost_name', { ascending: true })
        .order('start_month', { ascending: true });

    return { active, history };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();

        const cost_name = form.get('cost_name');
        const amount = Number(form.get('amount'));
        const raw = form.get('start_month');
        const start_month = `${raw}-01`;

        // ⭐ INGEN user_id längre
        const { error } = await supabase.from('fixed_costs').insert({
            cost_name,
            amount,
            start_month,
            end_month: null
        });

        if (error) {
            console.error('create fixed cost error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    },

    update: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');
        const supabase = locals.supabase;

        const form = await request.formData();
        const group_id = form.get('cost_group_id');
        const new_amount = Number(form.get('amount'));
        const raw = form.get('start_month');
        const new_start = `${raw}-01`;

        // ⭐ HÄMTA AKTIV POST UTAN user_id
        const { data: active } = await supabase
            .from('fixed_costs')
            .select('*')
            .eq('cost_group_id', group_id)
            .is('end_month', null)
            .single();

        if (!active) return fail(400, { error: 'Ingen aktiv period hittades' });

        // ⭐ Avsluta gamla perioden
        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        await supabase
            .from('fixed_costs')
            .update({ end_month })
            .eq('id', active.id);

        // ⭐ Skapa ny period
        await supabase.from('fixed_costs').insert({
            cost_group_id: group_id,
            cost_name: active.cost_name,
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
        const group_id = form.get('cost_group_id');
        const raw = form.get('end_month');
        const end_month = `${raw}-01`;

        // ⭐ Avsluta utan user_id
        await supabase
            .from('fixed_costs')
            .update({ end_month })
            .eq('cost_group_id', group_id)
            .is('end_month', null);

        return { success: true };
    }
};
