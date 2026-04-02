import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAccessContext } from '$lib/server/access';

export const load: PageServerLoad = async ({ locals, url }) => {
    const access = await getAccessContext(locals, url);

    if (!access.allowed) {
        return redirect(303, '/login');
    }

    const supabase = locals.supabase;
    const householdId = locals.householdId;

    const targetUserId = access.selectedUserId;

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
        profiles!allowance_user_fk (
            full_name
        )
    `;

    const { data: active } = await supabase
        .from('allowance')
        .select(selectFields)
        .eq('household_id', householdId)
        .eq('user_id', targetUserId)
        .is('end_month', null)
        .order('start_month', { ascending: true });

    const { data: history } = await supabase
        .from('allowance')
        .select(selectFields)
        .eq('household_id', householdId)
        .eq('user_id', targetUserId)
        .not('end_month', 'is', null)
        .order('start_month', { ascending: true });

    return {
        access,
        active: active ?? [],
        history: history ?? []
    };
};

export const actions: Actions = {
    create: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) return redirect(303, '/login');

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const selectedUserId = form.get('selected_user_id');

        if (!access.selectableMembers.some((m: any) => m.user_id === selectedUserId)) {
            return fail(403, { error: 'Ingen behörighet att skapa för denna användare.' });
        }

        const amount = Number(form.get('amount'));
        const start_raw = form.get('start_month');
        const title = form.get('title');
        const description = form.get('description');

        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('allowance').insert({
            household_id: householdId,
            user_id: selectedUserId,
            allowance_group_id: crypto.randomUUID(),
            amount,
            start_month,
            end_month: null,
            title,
            description
        });

        if (error) return fail(400, { error: error.message });

        return { success: true };
    },

    update: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) return redirect(303, '/login');

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const selectedUserId = form.get('selected_user_id');

        if (!access.selectableMembers.some((m: any) => m.user_id === selectedUserId)) {
            return fail(403, { error: 'Ingen behörighet att uppdatera denna användare.' });
        }

        const group_id = form.get('allowance_group_id');
        const new_amount = Number(form.get('amount'));
        const new_start_raw = form.get('start_month');
        const new_start = `${new_start_raw}-01`;

        const { data: active } = await supabase
            .from('allowance')
            .select('*')
            .eq('allowance_group_id', group_id)
            .eq('household_id', householdId)
            .eq('user_id', selectedUserId)
            .is('end_month', null)
            .single();

        if (!active) return fail(400, { error: 'Ingen aktiv period hittades.' });

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
            user_id: selectedUserId,
            allowance_group_id: group_id,
            amount: new_amount,
            start_month: new_start,
            end_month: null
        });

        if (insertError) return fail(400, { error: insertError.message });

        return { success: true };
    },

    end: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) return redirect(303, '/login');

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const selectedUserId = form.get('selected_user_id');

        if (!access.selectableMembers.some((m: any) => m.user_id === selectedUserId)) {
            return fail(403, { error: 'Ingen behörighet att avsluta denna användare.' });
        }

        const group_id = form.get('allowance_group_id');
        const end_raw = form.get('end_month');
        const end_month = `${end_raw}-01`;

        const { error } = await supabase
            .from('allowance')
            .update({ end_month })
            .eq('allowance_group_id', group_id)
            .eq('household_id', householdId)
            .eq('user_id', selectedUserId)
            .is('end_month', null);

        if (error) return fail(400, { error: error.message });

        return { success: true };
    }
};
