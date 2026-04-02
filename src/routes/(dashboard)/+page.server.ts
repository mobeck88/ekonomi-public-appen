import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load = async ({ locals, cookies }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { user, incomes: [], expenses: [], subscriptions: [], electricity: [], savings: [] };

    const access_token = cookies.get('sb-access-token');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        }
    });

    // ⭐ Extra inkomster
    const { data: incomes } = await supabase
        .from('extra_income')
        .select('*')
        .eq('household_id', householdId)
        .order('date', { ascending: false });

    // ⭐ Gemensamma utgifter
    const { data: expenses } = await supabase
        .from('shared_expenses')
        .select('*')
        .eq('household_id', householdId)
        .order('date', { ascending: false });

    // ⭐ Abonnemang
    const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('household_id', householdId)
        .is('end_month', null)
        .order('start_month', { ascending: true });

    // ⭐ Elförbrukning per månad
    const { data: electricity } = await supabase
        .from('electricity_monthly')
        .select('*')
        .eq('household_id', householdId)
        .order('month', { ascending: true });

    // ⭐ Sparströmmar
    const { data: savings } = await supabase
        .from('saving_streams')
        .select('*')
        .eq('household_id', householdId)
        .order('start_month', { ascending: true });

    return {
        user,
        incomes: incomes ?? [],
        expenses: expenses ?? [],
        subscriptions: subscriptions ?? [],
        electricity: electricity ?? [],
        savings: savings ?? []
    };
};
