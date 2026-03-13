import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) {
        return redirect(303, '/login');
    }

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
            fixedNames: [],
            members: []
        };
    }

    // Hushållets medlemmar
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id, profiles(full_name)')
        .eq('household_id', householdId);

    const memberList =
        members?.map((m) => ({
            id: m.user_id,
            name: m.profiles.full_name
        })) ?? [];

    const selectedYear = url.searchParams.get('year') ?? new Date().getFullYear().toString();

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
            .lte('start_date', yearEnd)
            .or(`end_date.gte.${yearStart},end_date.is.null`),

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
    const savingsRows = savingsRes.data ?? [];
    const allowance = allowanceRes.data ?? [];
    const kids = kidsRes.data ?? [];
    const unexpected = unexpectedRes.data ?? [];
    const extra = extraRes.data ?? [];
    const loans = loansRes.data ?? [];
    const expenses = expensesRes.data ?? [];

    const sortedExpenses = expenses.sort((a, b) => {
        const order: Record<string, number> = { shared: 0 };
        memberList.forEach((m, i) => (order[m.id] = i + 1));
        return (order[a.owner] ?? 99) - (order[b.owner] ?? 99);
    });

    const ownerMap = Object.fromEntries(sortedExpenses.map((e) => [e.title ?? 'Okänd', e.owner]));

    const fixedNames = [...new Set(fixed.map((f) => f.cost_name as string))];

    const intervalMap = Object.fromEntries(
        sortedExpenses.map((e) => [e.title ?? 'Okänd', e.interval_months])
    );

    const toYM = (value: any) => {
        if (!value) return null;
        return new Date(value).toISOString().slice(0, 7);
    };

    const isActive = (row: any, ym: string) => {
        const start = toYM(row.start_month ?? row.start_date);
        const end = toYM(row.end_month ?? row.end_date);
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

    // Inkomster – vi använder dem inte i UI just nu, men räknar ändå ut totalen
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
        return Number(row?.amount ?? 0);
    });

    // Generisk helper: per användare + gemensamt (owner='shared')
    const perUserOrShared = (rows: any[], ym: string) => {
        const active = rows.filter((r) => isActive(r, ym));
        const result: Record<string, number> = {};

        for (const member of memberList) {
            result[member.name] = active
                .filter(
                    (r) =>
                        r.owner === member.id ||
                        r.user_id === member.id ||
                        r.person_id === member.id
                )
                .reduce((a, r) => a + Number(r.amount ?? 0), 0);
        }

        result.shared = active
            .filter((r) => r.owner === 'shared')
            .reduce((a, r) => a + Number(r.amount ?? 0), 0);

        return result;
    };

    // Abonnemang per användare + gemensamt
    const subs = months.map((m) => perUserOrShared(subscriptions, m));

    // Sparande per användare (ev. gemensamt om owner='shared' skulle införas)
    const savingsPerUser = months.map((m) => perUserOrShared(savingsRows, m));

    // Fickpengar per användare + gemensamt
    const allowanceUser = months.map((m) => perUserOrShared(allowance, m));

    // Fasta kostnader + expenses
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

    // Lån – total per månad (inte per person)
    const loansPerMonth = months.map((m) => sum(loans, m));

    // Barn – per barn, per månad (ingen shared här)
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

        subs,
        savings: savingsPerUser,
        allowanceUser,

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
        fixedNames,
        members: memberList
    };
};
