import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
    BUDGET_ANDREAS_USER_ID,
    BUDGET_HANNA_USER_ID
} from '$env/static/private';

export const load: PageServerLoad = async ({ url, locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    const selectedYear =
        url.searchParams.get('year') ?? new Date().getFullYear().toString();

    const months = Array.from({ length: 12 }, (_, i) => {
        const m = (i + 1).toString().padStart(2, '0');
        return `${selectedYear}-${m}`;
    });

    const yearStart = `${selectedYear}-01-01`;
    const yearEnd = `${selectedYear}-12-31`;

    // OR-filter för slutdatum
    const endFilter = `end_month.gte.${yearStart},end_month.is.null`;

    const [
        incomesRes,
        electricityRes,
        fixedRes,
        subscriptionsRes,
        savingsRes,
        allowanceRes,
        kidsRes,
        unexpectedRes,
        extraRes,
        loansRes
    ] = await Promise.all([
        supabase.from('monthly_income')
            .select('*')
            .gte('month', yearStart)
            .lte('month', yearEnd),

        supabase.from('electricity')
            .select('*')
            .gte('month', yearStart)
            .lte('month', yearEnd),

        supabase.from('fixed_costs')
            .select('*')
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase.from('subscriptions')
            .select('*')
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase.from('savings')
            .select('*')
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase.from('allowance')
            .select('*')
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase.from('kids_allowance')
            .select('*')
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase.from('unexpected_expenses')
            .select('*')
            .gte('date', yearStart)
            .lte('date', yearEnd),

        supabase.from('extra_income')
            .select('*')
            .gte('date', yearStart)
            .lte('date', yearEnd),

        supabase.from('loans')
            .select('*')
            .lte('start_month', yearEnd)
            .or(endFilter)
    ]);

    const incomes = incomesRes.data ?? [];
    const electricity = electricityRes.data ?? [];
    const fixed = fixedRes.data ?? [];
    const subscriptions = subscriptionsRes.data ?? [];
    const savings = savingsRes.data ?? [];
    const allowance = allowanceRes.data ?? [];
    const kids = kidsRes.data ?? [];
    const unexpected = unexpectedRes.data ?? [];
    const extra = extraRes.data ?? [];
    const loans = loansRes.data ?? [];

    const toYM = (value: any) => {
        if (!value) return null;
        return new Date(value).toISOString().slice(0, 7);
    };

    const isActive = (row: any, ym: string) => {
        const start = toYM(row.start_month);
        const end = toYM(row.end_month);
        return start && start <= ym && (!end || end >= ym);
    };

    const sum = (rows: any[], ym: string) =>
        rows
            .filter((r) => isActive(r, ym))
            .reduce((acc, r) => acc + Number(r.amount ?? 0), 0);

    const incomePerMonth = months.map((m) =>
        incomes
            .filter((i) => toYM(i.month) === m)
            .reduce(
                (sum, i) =>
                    sum +
                    Number(i.ord_nettolon ?? 0) +
                    Number(i.ass_nettolon ?? 0) +
                    Number(i.fk_nettolon ?? 0),
                0
            )
    );

    const electricityPerMonth = months.map((m) => {
        const row = electricity.find((e) => toYM(e.month) === m);
        return Number(row?.eon_amount ?? 0) + Number(row?.tibber_amount ?? 0);
    });

    const fixedGroups = [...new Set(fixed.map((f) => f.cost_name))];
    const fixedPerGroup = Object.fromEntries(
        fixedGroups.map((name) => [
            name,
            months.map((m) =>
                fixed
                    .filter((f) => f.cost_name === name && isActive(f, m))
                    .reduce((acc, f) => acc + Number(f.amount), 0)
            )
        ])
    );

    const loansPerMonth = months.map((m) => sum(loans, m));

    return {
        selectedYear,
        months,

        incomePerMonth,
        electricityPerMonth,
        fixedPerGroup,
        loansPerMonth,

        subsA: months.map((m) =>
            sum(subscriptions.filter((s) => s.user_id === BUDGET_ANDREAS_USER_ID), m)
        ),

        subsH: months.map((m) =>
            sum(subscriptions.filter((s) => s.user_id === BUDGET_HANNA_USER_ID), m)
        ),

        savingsA: months.map((m) =>
            sum(savings.filter((s) => s.user_id === BUDGET_ANDREAS_USER_ID), m)
        ),

        savingsH: months.map((m) =>
            sum(savings.filter((s) => s.user_id === BUDGET_HANNA_USER_ID), m)
        ),

        allowanceA: months.map((m) =>
            sum(allowance.filter((a) => a.user_id === BUDGET_ANDREAS_USER_ID), m)
        ),

        allowanceH: months.map((m) =>
            sum(allowance.filter((a) => a.user_id === BUDGET_HANNA_USER_ID), m)
        ),

        theo: months.map((m) =>
            sum(kids.filter((k) => k.child_name === 'Theo'), m)
        ),

        lowe: months.map((m) =>
            sum(kids.filter((k) => k.child_name === 'Lowe'), m)
        ),

        unexpectedPerMonth: months.map((m) =>
            unexpected
                .filter((u) => toYM(u.date) === m)
                .reduce((acc, u) => acc + Number(u.amount), 0)
        ),

        extraPerMonth: months.map((m) =>
            extra
                .filter((x) => toYM(x.date) === m)
                .reduce((acc, x) => acc + Number(x.amount), 0)
        ),

        fixedGroups
    };
};
