import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { active: [], history: [], members: [] };

    // ⭐ Aktiva sparanden
    const { data: active, error: activeError } = await supabase
        .from('savings')
        .select(`
            id,
            user_id,
            household_id,
            amount,
            start_month,
            end_month,
            title,
            description,
            saving_group_id,
            created_at,
            owner,
            profiles!fk_savings_user(full_name)
        `)
        .eq('household_id', householdId)
        .is('end_month', null)
        .order('start_month', { ascending: true });

    if (activeError) {
        console.error('load savings active error', activeError);
        return { active: [], history: [], members: [] };
    }

    // ⭐ Historik
    const { data: history, error: historyError } = await supabase
        .from('savings')
        .select(`
            id,
            user_id,
            household_id,
            amount,
            start_month,
            end_month,
            title,
            description,
            saving_group_id,
            created_at,
            owner,
            profiles!fk_savings_user(full_name)
        `)
        .eq('household_id', householdId)
        .not('end_month', 'is', null)
        .order('start_month', { ascending: true });

    if (historyError) {
        console.error('load savings history error', historyError);
        return { active: active ?? [], history: [], members: [] };
    }

    // ⭐ Hämta hushållsmedlemmar
    const { data: members, error: membersError } = await supabase
        .from('household_members')
        .select('user_id, profiles(full_name)')
        .eq('household_id', householdId);

    if (membersError) {
        console.error('load household_members error', membersError);
        return {
            active: active ?? [],
            history: history ?? [],
            members: []
        };
    }

    return {
        active: active ?? [],
        history: history ?? [],
        members: members ?? []
    };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const form = await request.formData();

        const amount = Number(form.get('amount'));
        const start_raw = form.get('start_month');
        const title = form.get('title');
        const description = form.get('description');
        const owner = form.get('owner');

        if (isNaN(amount)) return fail(400, { error: 'Ogiltigt belopp.' });
        if (!start_raw) return fail(400, { error: 'Startmånad saknas.' });

        const start_month = `${start_raw}-01`;

        // ⭐ 1. Skapa posten
        const { data: inserted, error: insertError } = await supabase
            .from('savings')
            .insert({
                user_id: user.id,
                household_id: householdId,
                amount,
                start_month,
                end_month: null,
                title,
                description,
                owner
            })
            .select('id')
            .single();

        if (insertError || !inserted) {
            console.error('create saving error', insertError);
            return fail(400, { error: insertError?.message });
        }

        // ⭐ 2. Sätt saving_group_id = id
        const { error: groupError } = await supabase
            .from('savings')
            .update({ saving_group_id: inserted.id })
            .eq('id', inserted.id);

        if (groupError) {
            console.error('set saving_group_id error', groupError);
            return fail(400, { error: groupError.message });
        }

        return { success: true };
    },

    update: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const form = await request.formData();
        const group_id = form.get('saving_group_id');
        const new_amount = Number(form.get('amount'));
        const new_owner = form.get('owner');
        const new_start_raw = form.get('start_month');

        if (!group_id) return fail(400, { error: 'Ingen grupp angiven.' });
        if (isNaN(new_amount)) return fail(400, { error: 'Ogiltigt belopp.' });
        if (!new_start_raw) return fail(400, { error: 'Ny startmånad saknas.' });

        const new_start = `${new_start_raw}-01`;

        // ⭐ Hämta aktiv period
        const { data: active, error: activeError } = await supabase
            .from('savings')
            .select('*')
            .eq('household_id', householdId)
            .eq('saving_group_id', group_id)
            .is('end_month', null)
            .single();

        if (activeError || !active) {
            console.error('fetch active saving error', activeError);
            return fail(400, { error: 'Ingen aktiv period hittades.' });
        }

        // ⭐ Avsluta gamla perioden
        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        const { error: endError } = await supabase
            .from('savings')
            .update({ end_month })
            .eq('id', active.id);

        if (endError) {
            console.error('end saving error', endError);
            return fail(400, { error: endError.message });
        }

        // ⭐ Skapa ny period
        const { error: insertError } = await supabase.from('savings').insert({
            user_id: user.id,
            household_id: householdId,
            saving_group_id: group_id,
            amount: new_amount,
            owner: new_owner,
            title: active.title,
            description: active.description,
            start_month: new_start,
            end_month: null
        });

        if (insertError) {
            console.error('insert new saving period error', insertError);
            return fail(400, { error: insertError.message });
        }

        return { success: true };
    },

    end: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const form = await request.formData();
        const group_id = form.get('saving_group_id');
        const end_raw = form.get('end_month');

        if (!group_id) return fail(400, { error: 'Ingen grupp angiven.' });
        if (!end_raw) return fail(400, { error: 'Slutmånad saknas.' });

        const end_month = `${end_raw}-01`;

        const { error } = await supabase
            .from('savings')
            .update({ end_month })
            .eq('household_id', householdId)
            .eq('saving_group_id', group_id)
            .is('end_month', null);

        if (error) {
            console.error('end saving error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
