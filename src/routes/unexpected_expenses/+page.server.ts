import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    const { data } = await supabase
        .from('unexpected_expenses')
        .select('*')
        .order('date', { ascending: false });

    return { entries: data ?? [] };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');

        const supabase = locals.supabase;
        const form = await request.formData();

        const date_raw = form.get('date'); // YYYY-MM-DD
        const title = form.get('title');
        const description = form.get('description');
        const amount = Number(form.get('amount'));

        const { error } = await supabase.from('unexpected_expenses').insert({
            date: date_raw,
            title,
            description,
            amount
        });

        if (error) {
            console.error('create unexpected expense error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
