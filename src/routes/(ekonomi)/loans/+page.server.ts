import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { active: [], history: [], members: [] };

    // ⭐ Aktiva lån
    const { data: active, error: activeError } = await supabase
        .from('loans')
        .select(`
            id,
            household_id,
            user_id,
            loan_name,
            reference,
            category,
            amount,
            owner,
            start_month,
            end_month,
            loan_group_id,
            created_at,
            profiles!loans_user_fk(full_name)
        `)
        .eq('household_id', householdId)
        .is('end_month', null)
        .order('loan_name', { ascending: true });

    if (activeError) {
        console.error('load loans active error', activeError);
        return { active: [], history: [], members: [] };
    }

    // ⭐ Historik
    const { data: history, error: historyError } = await supabase
        .from('loans')
        .select(`
            id,
            household_id,
            user_id,
            loan_name,
            reference,
            category,
            amount,
            owner,
            start_month,
            end_month,
            loan_group_id,
            created_at,
            profiles!loans_user_fk(full_name)
        `)
        .eq('household_id', householdId)
        .not('end_month', 'is', null)
        .order('loan_name', { ascending: true })
        .order('start_month', { ascending: true });

    if (historyError) {
        console.error('load loans history error', historyError);
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

        const loan_name = form.get('loan_name');
        const reference = form.get('reference');
        const amount = Number(form.get('amount'));
        const owner = form.get('owner');
        const raw = form.get('start_month');
        const start_month = raw ? `${raw}-01` : null;

        if (!loan_name) return fail(400, { error: 'Lånets namn saknas.' });
        if (isNaN(amount)) return fail(400, { error: 'Ogiltigt belopp.' });
        if (!start_month) return fail(400, { error: 'Startmånad saknas.' });

        // ⭐ 1. Skapa posten
        const { data: inserted, error: insertError } = await supabase
            .from('loans')
            .insert({
                household_id: householdId,
                user_id: user.id,
                loan_name,
                reference,
                amount,
                owner,
                start_month,
                end_month: null
            })
            .select('id')
            .single();

        if (insertError || !inserted) {
            console.error('create loan error', insertError);
            return fail(400, { error: insertError?.message });
        }

        // ⭐ 2. Sätt loan_group_id = id
        const { error: groupError } = await supabase
            .from('loans')
            .update({ loan_group_id: inserted.id })
            .eq('id', inserted.id);

        if (groupError) {
            console.error('set group_id error', groupError);
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
        const group_id = form.get('loan_group_id');
        const new_amount = Number(form.get('amount'));
        const new_owner = form.get('owner');
        const raw = form.get('start_month');
        const new_start = raw ? `${raw}-01` : null;

        if (!group_id) return fail(400, { error: 'Ingen grupp angiven.' });
        if (isNaN(new_amount)) return fail(400, { error: 'Ogiltigt belopp.' });
        if (!new_start) return fail(400, { error: 'Ny startmånad saknas.' });

        // ⭐ Hämta aktiv post
        const { data: active, error: activeError } = await supabase
            .from('loans')
            .select('*')
            .eq('household_id', householdId)
            .eq('loan_group_id', group_id)
            .is('end_month', null)
            .single();

        if (activeError || !active) {
            console.error('fetch active loan error', activeError);
            return fail(400, { error: 'Ingen aktiv period hittades.' });
        }

        // ⭐ Avsluta gamla perioden
        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        const { error: endError } = await supabase
            .from('loans')
            .update({ end_month })
            .eq('id', active.id);

        if (endError) {
            console.error('end loan error', endError);
            return fail(400, { error: endError.message });
        }

        // ⭐ Skapa ny period
        const { error: insertError } = await supabase.from('loans').insert({
            household_id: householdId,
            user_id: user.id,
            loan_group_id: group_id,
            loan_name: active.loan_name,
            reference: active.reference,
            amount: new_amount,
            owner: new_owner,
            start_month: new_start,
            end_month: null
        });

        if (insertError) {
            console.error('insert new loan period error', insertError);
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
        const group_id = form.get('loan_group_id');
        const raw = form.get('end_month');
        const end_month = raw ? `${raw}-01` : null;

        if (!group_id) return fail(400, { error: 'Ingen grupp angiven.' });
        if (!end_month) return fail(400, { error: 'Slutmånad saknas.' });

        const { error } = await supabase
            .from('loans')
            .update({ end_month })
            .eq('household_id', householdId)
            .eq('loan_group_id', group_id)
            .is('end_month', null);

        if (error) {
            console.error('end loan error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
