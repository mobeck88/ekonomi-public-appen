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
        return { active: [], history: [], members: [] };
    }

    // Hämta medlemmar (för owner)
    const { data: members, error: membersError } = await supabase
        .from('household_members')
        .select('user_id, profiles(full_name)')
        .eq('household_id', householdId);

    if (membersError) {
        console.error('membersError', membersError);
        return fail(500, { error: 'Kunde inte ladda medlemmar' });
    }

    // Hämta aktiva expenses
    const { data: active, error: activeError } = await supabase
        .from('expenses')
        .select(`
            id,
            household_id,
            owner,
            title,
            description,
            amount,
            interval_months,
            start_month,
            end_month,
            expense_group_id,
            created_at,
            profiles!expenses_owner_fkey(full_name)
        `)
        .eq('household_id', householdId)
        .is('end_month', null)
        .order('start_month', { ascending: true });

    if (activeError) {
        console.error('activeError', activeError);
        return fail(500, { error: 'Kunde inte ladda aktiva utgifter' });
    }

    // Hämta historik
    const { data: history, error: historyError } = await supabase
        .from('expenses')
        .select(`
            id,
            household_id,
            owner,
            title,
            description,
            amount,
            interval_months,
            start_month,
            end_month,
            expense_group_id,
            created_at,
            profiles!expenses_owner_fkey(full_name)
        `)
        .eq('household_id', householdId)
        .neq('end_month', null)
        .order('start_month', { ascending: true });

    if (historyError) {
        console.error('historyError', historyError);
        return fail(500, { error: 'Kunde inte ladda historik' });
    }

    return {
        members: members ?? [],
        active: active ?? [],
        history: history ?? []
    };
};

export const actions: Actions = {
    // CREATE
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
        const owner = form.get('owner')?.toString();
        const start_raw = form.get('start_month')?.toString();

        if (!title) return fail(400, { error: 'Titel saknas' });
        if (!amount_raw || isNaN(Number(amount_raw))) return fail(400, { error: 'Ogiltigt belopp' });
        if (!interval_raw || isNaN(Number(interval_raw))) return fail(400, { error: 'Ogiltigt intervall' });
        if (!owner) return fail(400, { error: 'Ägare saknas' });
        if (!start_raw || !/^\d{4}-\d{2}$/.test(start_raw)) {
            return fail(400, { error: 'Startmånad saknas eller ogiltig' });
        }

        const amount = Number(amount_raw);
        const interval_months = Number(interval_raw);
        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('expenses').insert({
            household_id: householdId,
            owner,
            title,
            description,
            amount,
            interval_months,
            start_month,
            end_month: null,
            expense_group_id: crypto.randomUUID()
        });

        if (error) {
            console.error('insertError', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    },

    // UPDATE (avsluta gammal + skapa ny)
    update: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) return redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const form = await request.formData();

        const group_id = form.get('expense_group_id');
        const new_amount = Number(form.get('amount'));
        const new_interval = Number(form.get('interval_months'));
        const new_start_raw = form.get('start_month')?.toString();
        const new_title = form.get('title')?.toString().trim();
        const new_description = form.get('description')?.toString().trim() || null;
        const new_owner = form.get('owner')?.toString();

        if (!group_id) return fail(400, { error: 'Ingen grupp angiven.' });
        if (!new_start_raw || !/^\d{4}-\d{2}$/.test(new_start_raw)) {
            return fail(400, { error: 'Ogiltig startmånad' });
        }

        const new_start = `${new_start_raw}-01`;

        // Hämta aktiv period
        const { data: active } = await supabase
            .from('expenses')
            .select('*')
            .eq('expense_group_id', group_id)
            .eq('household_id', householdId)
            .is('end_month', null)
            .single();

        if (!active) {
            return fail(400, { error: 'Ingen aktiv period hittades.' });
        }

        // Avsluta aktiv period
        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        await supabase
            .from('expenses')
            .update({ end_month })
            .eq('id', active.id)
            .eq('household_id', householdId);

        // Skapa ny period
        const { error: insertError } = await supabase.from('expenses').insert({
            household_id: householdId,
            owner: new_owner,
            title: new_title,
            description: new_description,
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

    // END (avsluta aktiv period)
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
            .from('expenses')
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
