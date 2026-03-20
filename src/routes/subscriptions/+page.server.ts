import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getAccessContext } from '$lib/server/access';

export const load: PageServerLoad = async ({ locals, url }) => {
    const access = await getAccessContext(locals, url);

    if (!access.allowed) throw redirect(303, '/login');

    const supabase = locals.supabase;
    const householdId = locals.householdId;

    if (!householdId) {
        return {
            active: [],
            history: [],
            members: [],
            access
        };
    }

    // ⭐ Hämta abonnemang för selectedUserId
    const { data: active } = await supabase
        .from('subscriptions')
        .select(`
            id,
            household_id,
            user_id,
            cost_name,
            amount,
            owner,
            start_month,
            end_month,
            cost_group_id,
            created_at,
            profiles!subscriptions_user_id_fkey(full_name)
        `)
        .eq('household_id', householdId)
        .eq('user_id', access.selectedUserId)
        .is('end_month', null)
        .order('cost_name', { ascending: true });

    const { data: history } = await supabase
        .from('subscriptions')
        .select(`
            id,
            household_id,
            user_id,
            cost_name,
            amount,
            owner,
            start_month,
            end_month,
            cost_group_id,
            created_at,
            profiles!subscriptions_user_id_fkey(full_name)
        `)
        .eq('household_id', householdId)
        .eq('user_id', access.selectedUserId)
        .not('end_month', 'is', null)
        .order('cost_name', { ascending: true })
        .order('start_month', { ascending: true });

    // ⭐ Hämta hushållsmedlemmar (för dropdown)
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id, profiles(full_name)')
        .eq('household_id', householdId);

    return {
        active: active ?? [],
        history: history ?? [],
        members: members ?? [],
        access
    };
};

export const actions: Actions = {
    create: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const targetUserId = form.get('selected_user_id');

        // ⭐ Validera att targetUserId är tillåten
        if (!access.selectableMembers.some(m => m.user_id === targetUserId)) {
            return fail(403, { error: 'Otillåten användare.' });
        }

        const cost_name = form.get('cost_name');
        const amount = Number(form.get('amount'));
        const owner = form.get('owner');
        const raw = form.get('start_month');
        const start_month = raw ? `${raw}-01` : null;

        if (!cost_name) return fail(400, { error: 'Namn saknas.' });
        if (isNaN(amount)) return fail(400, { error: 'Ogiltigt belopp.' });
        if (!start_month) return fail(400, { error: 'Startmånad saknas.' });

        const { error } = await supabase.from('subscriptions').insert({
            household_id: householdId,
            user_id: targetUserId,
            cost_name,
            amount,
            owner,
            start_month,
            end_month: null
        });

        if (error) return fail(400, { error: error.message });

        return { success: true };
    },

    update: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const targetUserId = form.get('selected_user_id');

        if (!access.selectableMembers.some(m => m.user_id === targetUserId)) {
            return fail(403, { error: 'Otillåten användare.' });
        }

        const group_id = form.get('cost_group_id');
        const new_amount = Number(form.get('amount'));
        const new_owner = form.get('owner');
        const raw = form.get('start_month');
        const new_start = raw ? `${raw}-01` : null;

        if (!group_id) return fail(400, { error: 'Ingen kostnadsgrupp angiven.' });
        if (isNaN(new_amount)) return fail(400, { error: 'Ogiltigt belopp.' });
        if (!new_start) return fail(400, { error: 'Ny startmånad saknas.' });

        // ⭐ Hämta aktiv post
        const { data: active } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('household_id', householdId)
            .eq('cost_group_id', group_id)
            .eq('user_id', targetUserId)
            .is('end_month', null)
            .single();

        if (!active) return fail(400, { error: 'Ingen aktiv period hittades.' });

        // ⭐ Avsluta gamla perioden
        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        await supabase
            .from('subscriptions')
            .update({ end_month })
            .eq('id', active.id);

        // ⭐ Skapa ny period
        const { error: insertError } = await supabase.from('subscriptions').insert({
            household_id: householdId,
            user_id: targetUserId,
            cost_group_id: group_id,
            cost_name: active.cost_name,
            amount: new_amount,
            owner: new_owner,
            start_month: new_start,
            end_month: null
        });

        if (insertError) return fail(400, { error: insertError.message });

        return { success: true };
    },

    end: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const targetUserId = form.get('selected_user_id');

        if (!access.selectableMembers.some(m => m.user_id === targetUserId)) {
            return fail(403, { error: 'Otillåten användare.' });
        }

        const group_id = form.get('cost_group_id');
        const raw = form.get('end_month');
        const end_month = raw ? `${raw}-01` : null;

        if (!group_id) return fail(400, { error: 'Ingen kostnadsgrupp angiven.' });
        if (!end_month) return fail(400, { error: 'Slutmånad saknas.' });

        const { error } = await supabase
            .from('subscriptions')
            .update({ end_month })
            .eq('household_id', householdId)
            .eq('user_id', targetUserId)
            .eq('cost_group_id', group_id)
            .is('end_month', null);

        if (error) return fail(400, { error: error.message });

        return { success: true };
    }
};
