import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;
    const householdId = locals.householdId;

    if (!householdId) {
        return {
            selectedYear: null,
            months: [],
            incomePerMonth: [],
            electricityPerMonth: [],
            fixedPerGroup: {},
            loansPerMonth: [],
            subs: [],
            savings: [],
            allowanceUser: [],
            kidsPerMonth: {},
            unexpectedPerMonth: [],
            extraPerMonth: [],
            fixedGroups: [],
            ownerMap: {},
            intervalMap: {},
            fixedNames: []
        };
    }

    const selectedYear =
        url.searchParams.get('year') ?? new Date().getFullYear().toString();

    const months = Array.from({ length: 12 }, (_, i) => {
        const m = (i + 1).toString().padStart(2, '0');
        return `${selectedYear}-${m}`;
    });

    const yearStart = `${selectedYear}-01-01`;
    const yearEnd = `${selectedYear}-12-31`;

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
        loansRes,
        expensesRes
    ] = await Promise.all([
        supabase
            .from('monthly_income')
            .select('*')
            .eq('household_id', householdId)
            .gte('month', yearStart)
            .lte('month', yearEnd),

        supabase
            .from('electricity_monthly')
            .select('*')
            .eq('household_id', householdId)
            .gte('month', yearStart)
            .lte('month', yearEnd),

        supabase
            .from('fixed_costs')
            .select('*')
            .eq('household_id', householdId)
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase
            .from('subscriptions')
            .select('*')
            .eq('household_id', householdId)
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase
            .from('saving_streams')
            .select('*')
            .eq('household_id', householdId)
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase
            .from('allowance')
            .select('*')
            .eq('household_id', householdId)
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase
            .from('kids_allowance')
            .select('*')
            .eq('household_id', householdId)
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase
            .from('unexpected_expenses')
            .select('*')
            .eq('household_id', householdId)
            .gte('date', yearStart)
            .lte('date', yearEnd),

        supabase
            .from('extra_income')
            .select('*')
            .eq('household_id', householdId)
            .gte('date', yearStart)
            .lte('date', yearEnd),

        supabase
            .from('loans')
            .select('*')
            .eq('household_id', householdId)
            .lte('start_month', yearEnd)
            .or(endFilter),

        supabase
            .from('expenses')
            .select('*')
            .eq('household_id', householdId)
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
    const expenses = expensesRes.data ?? [];

    const sortedExpenses = expenses.sort((a, b) => {
        const order: Record<string, number> = { shared: 0, [locals.user.id]: 1 };
        return (order[a.owner] ?? 2) - (order[b.owner] ?? 2);
    });

    const ownerMap = Object.fromEntries(
        sortedExpenses.map((e) => [e.title, e.owner])
    );

    const fixedNames = [...new Set(fixed.map((f) => f.cost_name as string))];

    const intervalMap = Object.fromEntries(
        sortedExpenses.map((e) => [e.title, e.interval_months])
    );

    const toYM = (value: any) => {
        if (!value) return null;
        return new Date(value).toISOString().slice(0, 7);
    };

    const isActive = (row: any, ym: string) => {
        const start = toYM(row.start_month);
        const end = toYM(row.end_month);
        return start && start <= ym && (!end || end >= ym);
    };

    const occursThisMonth = (row: any, ym: string) => {
        const start = toYM(row.start_month);
        if (!start) return false;

        const [startY, startM] = start.split('-').map(Number);
        const [curY, curM] = ym.split('-').map(Number);

        const monthsDiff = (curY - startY) * 12 + (curM - startM);

        return monthsDiff >= 0 && monthsDiff % Number(row.interval_months ?? 1) === 0;
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

    const fixedGroups = [
        ...new Set([
            ...fixed.map((f) => f.cost_name as string),
            ...sortedExpenses.map((e) => e.title as string)
        ])
    ];

    const fixedPerGroup = Object.fromEntries(
        fixedGroups.map((name) => [
            name,
            months.map((m) => {
                const fixedSum = fixed
                    .filter((f) => f.cost_name === name && isActive(f, m))
                    .reduce((acc, f) => acc + Number(f.amount ?? 0), 0);

                const expenseSum = sortedExpenses
                    .filter((e) => e.title === name && occursThisMonth(e, m))
                    .reduce((acc, e) => acc + Number(e.amount ?? 0), 0);

                return fixedSum + expenseSum;
            })
        ])
    );

    const loansPerMonth = months.map((m) => sum(loans, m));

    // Dynamiska barnnamn från Rubrik/child_name
    const childNames = [...new Set(kids.map((k) => k.child_name as string))];

    const kidsPerMonth = Object.fromEntries(
        childNames.map((name) => [
            name,
            months.map((m) =>
                sum(kids.filter((k) => k.child_name === name), m)
            )
        ])
    );

    return {
        selectedYear,
        months,

        incomePerMonth,
        electricityPerMonth,
        fixedPerGroup,
        loansPerMonth,

        subs: months.map((m) => sum(subscriptions, m)),

        savings: months.map((m) => sum(savings, m)),

        allowanceUser: months.map((m) => sum(allowance, m)),

        kidsPerMonth,

        unexpectedPerMonth: months.map((m) =>
            unexpected
                .filter((u) => toYM(u.date) === m)
                .reduce((acc, u) => acc + Number(u.amount ?? 0), 0)
        ),

        extraPerMonth: months.map((m) =>
            extra
                .filter((x) => toYM(x.date) === m)
                .reduce((acc, x) => acc + Number(x.amount ?? 0), 0)
        ),

        fixedGroups,
        ownerMap,
        intervalMap,
        fixedNames
    };
};
