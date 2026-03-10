import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    // Viktigt: return redirect istället för throw redirect
    if (!user) {
        return redirect(303, '/login');
    }

    if (!householdId) {
        return { active: [], history: [] };
    }

    const selectFields = `
        id,
        household_id,
        user_id,
        amount,
        start_month,
        end_month,
        title,
        description,
        allowance_group_id,
        created_at,
        profiles!user_id (
            full_name
        )
    `;

    const { data: active, error: activeError } = await supabase
        .from('allowance')
        .select(selectFields)
        .eq('household_id', householdId)
        .is('end_month', null)
        .order('start_month', { ascending: true });

    if (activeError) {
        console.error("ALLOWANCE ACTIVE ERROR:", activeError);
    }

    const { data: history, error: historyError } = await supabase
        .from('allowance')
        .select(selectFields)
        .eq('household_id', householdId)
        .neq('end_month', null)
        .order('start_month', { ascending: true });

    if (historyError) {
        console.error("ALLOWANCE HISTORY ERROR:", historyError);
    }

    return {
        active: active ?? [],
        history: history ?? []
    };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) return redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const form = await request.formData();

        const amount = Number(form.get('amount'));
        const start_raw = form.get('start_month');
        const title = form.get('title');
        const description = form.get('description');

        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('allowance').insert({
            household_id: householdId,
            user_id: user.id,
            allowance_group_id: crypto.randomUUID(),
            amount,
            start_month,
            end_month: null,
            title,
            description
        });

        if (error) {
            return fail(400, { error: error.message });
        }

        return { success: true };
    },

    update: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) return redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const form = await request.formData();
        const group_id = form.get('allowance_group_id');
        const new_amount = Number(form.get('amount'));
        const new_start_raw = form.get('start_month');

        const new_start = `${new_start_raw}-01`;

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

        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        await supabase
            .from('allowance')
            .update({ end_month })
            .eq('id', active.id)
            .eq('household_id', householdId);

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

    end: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) return redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

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
