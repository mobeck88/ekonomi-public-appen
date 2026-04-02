import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

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
        title,
        description,
        amount,
        interval_months,
        start_month,
        end_month,
        expense_group_id,
        created_at,
        profiles!expenses_riksnorm_user_fk (
            full_name
        )
    `;

    const { data: active } = await supabase
        .from('expenses_riksnorm')
        .select(selectFields)
        .eq('household_id', householdId)
        .is('end_month', null)
        .order('start_month', { ascending: true });

    const { data: history } = await supabase
        .from('expenses_riksnorm')
        .select(selectFields)
        .eq('household_id', householdId)
        .not('end_month', 'is', null)
        .order('start_month', { ascending: true });

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

        const title = form.get('title')?.toString().trim();
        const description = form.get('description')?.toString().trim() || null;
        const amount_raw = form.get('amount')?.toString();
        const interval_raw = form.get('interval_months')?.toString();
        const start_raw = form.get('start_month')?.toString();

        if (!title) return fail(400, { error: 'Titel saknas' });
        if (!amount_raw || isNaN(Number(amount_raw))) return fail(400, { error: 'Ogiltigt belopp' });
        if (!interval_raw || isNaN(Number(interval_raw))) return fail(400, { error: 'Ogiltigt intervall' });
        if (!start_raw || !/^\d{4}-\d{2}$/.test(start_raw)) {
            return fail(400, { error: 'Startmånad saknas eller ogiltig' });
        }

        const amount = Number(amount_raw);
        const interval_months = Number(interval_raw);
        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('expenses_riksnorm').insert({
            household_id: householdId,
            user_id: user.id,
            title,
            description,
            amount,
            interval_months,
            start_month,
            end_month: null,
            expense_group_id: crypto.randomUUID()
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
        const group_id = form.get('expense_group_id');
        const new_amount_raw = form.get('amount')?.toString();
        const new_interval_raw = form.get('interval_months')?.toString();
        const new_start_raw = form.get('start_month')?.toString();

        if (!group_id) return fail(400, { error: 'Ingen grupp angiven.' });
        if (!new_amount_raw || isNaN(Number(new_amount_raw))) {
            return fail(400, { error: 'Ogiltigt belopp' });
        }
        if (!new_interval_raw || isNaN(Number(new_interval_raw))) {
            return fail(400, { error: 'Ogiltigt intervall' });
        }
        if (!new_start_raw || !/^\d{4}-\d{2}$/.test(new_start_raw)) {
            return fail(400, { error: 'Ogiltig startmånad' });
        }

        const new_amount = Number(new_amount_raw);
        const new_interval = Number(new_interval_raw);
        const new_start = `${new_start_raw}-01`;

        const { data: active } = await supabase
            .from('expenses_riksnorm')
            .select('*')
            .eq('expense_group_id', group_id)
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
            .from('expenses_riksnorm')
            .update({ end_month })
            .eq('id', active.id)
            .eq('household_id', householdId);

        const { error: insertError } = await supabase.from('expenses_riksnorm').insert({
            household_id: householdId,
            user_id: user.id,
            title: active.title,
            description: active.description,
            amount: new_amount,
            interval_months: new_interval,
            start_month: new_start,
            end_month: null,
            expense_group_id: group_id
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
        const group_id = form.get('expense_group_id');
        const end_raw = form.get('end_month')?.toString();

        if (!group_id) return fail(400, { error: 'Ingen grupp angiven.' });
        if (!end_raw || !/^\d{4}-\d{2}$/.test(end_raw)) {
            return fail(400, { error: 'Ogiltig slutmånad' });
        }

        const end_month = `${end_raw}-01`;

        const { error } = await supabase
            .from('expenses_riksnorm')
            .update({ end_month })
            .eq('expense_group_id', group_id)
            .eq('household_id', householdId)
            .is('end_month', null);

        if (error) {
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
