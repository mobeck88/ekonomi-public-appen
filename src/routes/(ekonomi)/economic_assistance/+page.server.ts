import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { entries: [], members: [] };

    const { data: entries, error: entriesError } = await supabase
        .from('economic_assistance')
        .select(`
            id,
            household_id,
            user_id,
            date,
            amount,
            owner,
            created_at,
            profiles!economic_assistance_user_fk (
                full_name
            )
        `)
        .eq('household_id', householdId)
        .order('date', { ascending: false });

    if (entriesError) {
        console.error('load economic_assistance error', entriesError);
        return { entries: [], members: [] };
    }

    const { data: members, error: membersError } = await supabase
        .from('household_members')
        .select('user_id, profiles(full_name)')
        .eq('household_id', householdId);

    if (membersError) {
        console.error('load household_members error', membersError);
        return {
            entries: entries ?? [],
            members: []
        };
    }

    return {
        entries: entries ?? [],
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

        const date_raw = form.get('date');
        const amount = Number(form.get('amount'));
        const owner = form.get('owner');

        if (!date_raw) return fail(400, { error: 'Datum saknas.' });
        if (isNaN(amount)) return fail(400, { error: 'Ogiltigt belopp.' });

        const { error } = await supabase.from('economic_assistance').insert({
            household_id: householdId,
            user_id: user.id,
            date: date_raw,
            amount,
            owner
        });

        if (error) {
            console.error('create economic_assistance error', error);
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

        const id = form.get('id');
        const date_raw = form.get('date');
        const amount = Number(form.get('amount'));
        const owner = form.get('owner');

        if (!id) return fail(400, { error: 'ID saknas.' });
        if (!date_raw) return fail(400, { error: 'Datum saknas.' });
        if (isNaN(amount)) return fail(400, { error: 'Ogiltigt belopp.' });

        const { error } = await supabase
            .from('economic_assistance')
            .update({
                date: date_raw,
                amount,
                owner
            })
            .eq('id', id)
            .eq('household_id', householdId);

        if (error) {
            console.error('update economic_assistance error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
