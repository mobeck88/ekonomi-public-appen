import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { active: [], history: [], members: [] };

    // ⭐ Aktiva perioder
    const { data: active, error: activeError } = await supabase
        .from('kids_allowance')
        .select(`
            id,
            household_id,
            user_id,
            child_name,
            amount,
            title,
            description,
            owner,
            start_month,
            end_month,
            kids_group_id,
            created_at,
            profiles!kids_allowance_user_fk(full_name)
        `)
        .eq('household_id', householdId)
        .is('end_month', null)
        .order('child_name', { ascending: true })
        .order('start_month', { ascending: true });

    if (activeError) {
        console.error('load kids_allowance active error', activeError);
        return { active: [], history: [], members: [] };
    }

    // ⭐ Historik
    const { data: history, error: historyError } = await supabase
        .from('kids_allowance')
        .select(`
            id,
            household_id,
            user_id,
            child_name,
            amount,
            title,
            description,
            owner,
            start_month,
            end_month,
            kids_group_id,
            created_at,
            profiles!kids_allowance_user_fk(full_name)
        `)
        .eq('household_id', householdId)
        .not('end_month', 'is', null)
        .order('child_name', { ascending: true })
        .order('start_month', { ascending: true });

    if (historyError) {
        console.error('load kids_allowance history error', historyError);
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

        const child_name = form.get('child_name');
        const amount = Number(form.get('amount'));
        const title = form.get('title');
        const description = form.get('description');
        const owner = form.get('owner');
        const raw = form.get('start_month');
        const start_month = raw ? `${raw}-01` : null;

        if (!child_name) return fail(400, { error: 'Barnets namn saknas.' });
        if (isNaN(amount)) return fail(400, { error: 'Ogiltigt belopp.' });
        if (!start_month) return fail(400, { error: 'Startmånad saknas.' });

        const { error } = await supabase.from('kids_allowance').insert({
            household_id: householdId,
            user_id: user.id,
            child_name,
            amount,
            title,
            description,
            owner,
            start_month,
            end_month: null
        });

        if (error) {
            console.error('create kids_allowance error', error);
            return fail(400, { error: error.message });
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
        const group_id = form.get('kids_group_id');
        const new_amount = Number(form.get('amount'));
        const new_owner = form.get('owner');
        const raw = form.get('start_month');
        const new_start = raw ? `${raw}-01` : null;

        if (!group_id) return fail(400, { error: 'Ingen grupp angiven.' });
        if (isNaN(new_amount)) return fail(400, { error: 'Ogiltigt belopp.' });
        if (!new_start) return fail(400, { error: 'Ny startmånad saknas.' });

        // ⭐ Hämta aktiv post
        const { data: active, error: activeError } = await supabase
            .from('kids_allowance')
            .select('*')
            .eq('household_id', householdId)
            .eq('kids_group_id', group_id)
            .is('end_month', null)
            .single();

        if (activeError || !active) {
            console.error('fetch active kids_allowance error', activeError);
            return fail(400, { error: 'Ingen aktiv period hittades.' });
        }

        // ⭐ Avsluta gamla perioden
        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        const { error: endError } = await supabase
            .from('kids_allowance')
            .update({ end_month })
            .eq('id', active.id);

        if (endError) {
            console.error('end kids_allowance error', endError);
            return fail(400, { error: endError.message });
        }

        // ⭐ Skapa ny period
        const { error: insertError } = await supabase.from('kids_allowance').insert({
            household_id: householdId,
            user_id: user.id,
            kids_group_id: group_id,
            child_name: active.child_name,
            amount: new_amount,
            owner: new_owner,
            title: active.title,
            description: active.description,
            start_month: new_start,
            end_month: null
        });

        if (insertError) {
            console.error('insert new kids_allowance period error', insertError);
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
        const group_id = form.get('kids_group_id');
        const raw = form.get('end_month');
        const end_month = raw ? `${raw}-01` : null;

        if (!group_id) return fail(400, { error: 'Ingen grupp angiven.' });
        if (!end_month) return fail(400, { error: 'Slutmånad saknas.' });

        const { error } = await supabase
            .from('kids_allowance')
            .update({ end_month })
            .eq('household_id', householdId)
            .eq('kids_group_id', group_id)
            .is('end_month', null);

        if (error) {
            console.error('end kids_allowance error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
