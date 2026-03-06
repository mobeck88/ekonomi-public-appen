import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    const { data, error } = await supabase
        .from('electricity')
        .select('*')
        .order('month', { ascending: false });

    if (error) {
        console.error('Load error:', error);
        return { entries: [] };
    }

    return { entries: data ?? [] };
};

export const actions: Actions = {
    save: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');

        const supabase = locals.supabase;
        const form = await request.formData();

        const month_raw = form.get('month'); // YYYY-MM
        const eon_amount = Number(form.get('eon_amount'));
        const tibber_amount = Number(form.get('tibber_amount'));

        if (!month_raw) {
            return fail(400, { error: 'Månad saknas' });
        }

        const month = `${month_raw}-01`;

        const { data: existing, error: selectError } = await supabase
            .from('electricity')
            .select('*')
            .eq('month', month)
            .maybeSingle();

        if (selectError) {
            console.error('Select error:', selectError);
            return fail(400, { error: selectError.message });
        }

        if (existing) {
            const { error } = await supabase
                .from('electricity')
                .update({ eon_amount, tibber_amount })
                .eq('month', month);

            if (error) {
                console.error('Update error:', error);
                return fail(400, { error: error.message });
            }
        } else {
            const { error } = await supabase
                .from('electricity')
                .insert({ month, eon_amount, tibber_amount });

            if (error) {
                console.error('Insert error:', error);
                return fail(400, { error: error.message });
            }
        }

        throw redirect(303, '/electricity');
    }
};
