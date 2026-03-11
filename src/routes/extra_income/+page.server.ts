import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { entries: [], members: [] };

    // ⭐ Hämta extra inkomster
    const { data: entries, error: entriesError } = await supabase
        .from('extra_income')
        .select(`
            id,
            household_id,
            user_id,
            date,
            title,
            description,
            amount,
            owner,
            created_at,
            profiles!extra_income_user_fk (
                full_name
            )
        `)
        .eq('household_id', householdId)
        .order('date', { ascending: false });

    if (entriesError) {
        console.error('load extra_income error', entriesError);
        return { entries: [], members: [] };
    }

    // ⭐ Hämta hushållsmedlemmar
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id, profiles(full_name)')
        .eq('household_id', householdId);

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
        const title = form.get('title');
        const description = form.get('description');
        const amount = Number(form.get('amount'));
        const owner = form.get('owner'); // "shared" eller user_id

        if (!date_raw) return fail(400, { error: 'Datum saknas.' });
        if (!title) return fail(400, { error: 'Titel saknas.' });
        if (isNaN(amount)) return fail(400, { error: 'Ogiltigt belopp.' });

        const { error } = await supabase.from('extra_income').insert({
            household_id: householdId,
            user_id: user.id,
            date: date_raw,
            title,
            description,
            amount,
            owner
        });

        if (error) {
            console.error('create extra_income error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
