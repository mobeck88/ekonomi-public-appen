import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load: PageServerLoad = async ({ locals, cookies }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { active: [], history: [], members: [] };

    const access_token = cookies.get('sb-access-token');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        }
    });

    // ⭐ Hämta aktiva lån
    const { data: active } = await supabase
        .from('loans')
        .select('*')
        .eq('household_id', householdId)
        .is('end_month', null)
        .order('loan_name', { ascending: true });

    // ⭐ Hämta historik
    const { data: history } = await supabase
        .from('loans')
        .select('*')
        .eq('household_id', householdId)
        .not('end_month', 'is', null)
        .order('loan_name', { ascending: true })
        .order('start_month', { ascending: true });

    // ⭐ Hämta hushållsmedlemmar + namn
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id, profiles(full_name)')
        .eq('household_id', householdId);

    return {
        active: active ?? [],
        history: history ?? [],
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

        const loan_name = form.get('loan_name');
        const reference = form.get('reference');
        const amount = Number(form.get('amount'));
        const owner = form.get('owner'); // ⭐ user_id eller "shared"
        const start_raw = form.get('start_month');

        const start_month = `${start_raw}-01`;

        const { error } = await supabase.from('loans').insert({
            household_id: householdId,
            loan_name,
            reference,
            amount,
            owner,
            start_month,
            end_month: null
        });

        if (error) {
            console.error('create loan error', error);
            return fail(400, { error: error.message });
        }

        return { success: true };
    },

    update: async ({ request, locals, cookies }) => {
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
        const group_id = form.get('loan_group_id');
        const new_amount = Number(form.get('amount'));
        const new_owner = form.get('owner');
        const new_start_raw = form.get('start_month');

        const new_start = `${new_start_raw}-01`;

        // ⭐ Hämta aktiv post
        const { data: active } = await supabase
            .from('loans')
            .select('*')
            .eq('household_id', householdId)
            .eq('loan_group_id', group_id)
            .is('end_month', null)
            .single();

        if (!active) return fail(400, { error: 'Ingen aktiv period hittades' });

        // ⭐ Avsluta gamla perioden
        const end_date = new Date(new_start);
        end_date.setMonth(end_date.getMonth() - 1);
        const end_month = end_date.toISOString().slice(0, 10);

        await supabase
            .from('loans')
            .update({ end_month })
            .eq('id', active.id);

        // ⭐ Skapa ny period
        const { error: insertError } = await supabase.from('loans').insert({
            household_id: householdId,
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

    end: async ({ request, locals, cookies }) => {
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
        const group_id = form.get('loan_group_id');
        const end_raw = form.get('end_month');

        const end_month = `${end_raw}-01`;

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
