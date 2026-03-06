import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load = async ({ locals }) => {
    const user = locals.user;
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data: incomes } = await supabase
        .from('extra_income')
        .select('*')
        .eq('user_id', user.id);

    const { data: expenses } = await supabase
        .from('shared_expenses')
        .select('*')
        .eq('user_id', user.id);

    const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

    const { data: electricity } = await supabase
        .from('electricity_monthly')
        .select('*')
        .eq('user_id', user.id);

    const { data: savings } = await supabase
        .from('saving_streams')
        .select('*')
        .eq('user_id', user.id);

    return {
        user,
        incomes,
        expenses,
        subscriptions,
        electricity,
        savings
    };
};
