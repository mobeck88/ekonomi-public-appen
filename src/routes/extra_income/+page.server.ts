import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load: PageServerLoad = async ({ locals, cookies }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { entries: [], members: [] };

    const access_token = cookies.get('sb-access-token');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        }
    });

    // ⭐ Hämta inkomster
    const { data: entries } = await supabase
        .from('extra_income')
        .select('*')
        .eq('household_id', householdId)
        .order('date', { ascending: false });

    // ⭐ Hämta hushållsmedlemmar + namn
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
    create: async ({ request, locals, cookies }) => {
        const user = locals.user;
        const householdId = locals.householdId;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const access_token = cookies.get('sb-access-token');

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            }
        });

        const form = await request.formData();

        const date_raw = form.get('date');
        const title = form.get('title');
        const description = form.get('description');
        const amount = Number(form.get('amount'));
        const owner = form.get('owner'); // ⭐ user_id eller "shared"

        const { error } = await supabase.from('extra_income').insert({
            household_id: householdId,
            date: date_raw,
            title,
            description,
            amount,
            owner
        });

        if (error) {
            console.error('create extra income error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
