import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAccessContext } from '$lib/server/access';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) redirect(303, '/login');
    if (!householdId) return { active: [], history: [], access: null };

    const access = await getAccessContext(locals, url);

    if (!access.allowed) {
        throw redirect(303, '/forbidden');
    }

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
        profiles!allowance_user_fk ( full_name )
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
        active: active ?? [],
        history: history ?? [],
        access
    };
};

export const actions: Actions = {
    create: async ({ request, locals, url }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const access = await getAccessContext(locals, url);
        if (!access.allowed || !access.canEdit) return fail(403, { error: 'Ej behörig.' });

        const form = await request.formData();
        const selected_user_id = form.get('selected_user_id');

        if (!access.selectableMembers.includes(selected_user_id)) {
            return fail(403, { error: 'Ej behörig att skapa för denna användare.' });
        }

        const amount = Number(form.get('amount'));
        const start_raw = form.get('start_month');
        const title = form.get('title');
        const description = form.get('description');
        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('allowance').insert({
            household_id: householdId,
            user_id: selected_user_id,
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
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const access = await getAccessContext(locals, url);
        if (!access.allowed || !access.canEdit) return fail(403, { error: 'Ej behörig.' });

        const form = await request.formData();
        const selected_user_id = form.get('selected_user_id');

        if (!access.selectableMembers.includes(selected_user_id)) {
            return fail(403, { error: 'Ej behörig att uppdatera för denna användare.' });
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
            .eq('user_id', selected_user_id)
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
            user_id: selected_user_id,
            allowance_group_id: group_id,
            amount: new_amount,
            start_month: new_start,
            end_month: null
        });

        if (insertError) return fail(400, { error: insertError.message });
        return { success: true };
    },

    end: async ({ request, locals, url }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const access = await getAccessContext(locals, url);
        if (!access.allowed || !access.canEdit) return fail(403, { error: 'Ej behörig.' });

        const form = await request.formData();
        const selected_user_id = form.get('selected_user_id');

        if (!access.selectableMembers.includes(selected_user_id)) {
            return fail(403, { error: 'Ej behörig att avsluta för denna användare.' });
        }

        const group_id = form.get('allowance_group_id');
        const end_raw = form.get('end_month');
        const end_month = `${end_raw}-01`;

        const { error } = await supabase
            .from('allowance')
            .update({ end_month })
            .eq('allowance_group_id', group_id)
            .eq('household_id', householdId)
            .eq('user_id', selected_user_id)
            .is('end_month', null);

        if (error) return fail(400, { error: error.message });
        return { success: true };
    }
};
