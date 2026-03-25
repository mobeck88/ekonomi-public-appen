import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) return redirect(303, '/login');

    if (!householdId) {
        return {
            selectedYear: null,
            months: [],
            members: [],
            electricityPerMonth: [],
            fixedPerGroup: {},
            riksnormPerGroup: {},
            loansPerMonth: [],
            subs: [],
            savings: [],
            allowanceUser: [],
            kidsPerMonth: {},
            unexpectedPerMonth: [],
            extraPerMonth: [],
            fixedGroups: [],
            ownerMap: {},
            incomePerUser: {},
            incomeTotal: []
        };
    }

    // ⭐ Hämta hushållets medlemmar + roll
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id, role, profiles(full_name)')
        .eq('household_id', householdId);

    // ⭐ Filtrera bort guardians helt
    const memberList =
        members
            ?.filter((m) => m.role !== 'guardian')
            .map((m) => ({
                id: m.user_id,
                name: m.profiles.full_name
            })) ?? [];

    const selectedYear = url.searchParams.get('year') ?? new Date().getFullYear().toString();

    const months = Array.from({ length: 12 }, (_, i) => {
        const m = (i + 1).toString().padStart(2, '0');
        return `${selectedYear}-${m}`;
    });

    // Hämta alla tabeller
    const [
        electricityRes,
        fixedRes,
        subscriptionsRes,
        savingsRes,
        allowanceRes,
        kidsRes,
        unexpectedRes,
        extraRes,
        loansRes,
        expensesRes,
        incomeMonthsRes,
        primaryRes,
        extraJobsRes,
        fkRes,
        riksnormRes
    ] = await Promise.all([
        supabase.from('electricity').select('*').eq('household_id', householdId),
        supabase.from('fixed_costs').select('*').eq('household_id', householdId),
        supabase.from('subscriptions').select('*').eq('household_id', householdId),
        supabase.from('savings').select('*').eq('household_id', householdId),
        supabase.from('allowance').select('*').eq('household_id', householdId),
        supabase.from('kids_allowance').select('*').eq('household_id', householdId),
        supabase.from('unexpected_expenses').select('*').eq('household_id', householdId),
        supabase.from('extra_income').select('*').eq('household_id', householdId),
        supabase.from('loans').select('*').eq('household_id', householdId),
        supabase.from('expenses').select('*').eq('household_id', householdId),
        supabase
            .from('income_months')
            .select('id, month_date')
            .eq('household_id', householdId)
            .gte('month_date', `${selectedYear}-01-01`)
            .lte('month_date', `${selectedYear}-12-31`),
        supabase.from('income_primary_job').select('*').eq('household_id', householdId),
        supabase.from('income_extra_jobs').select('*').eq('household_id', householdId),
        supabase.from('income_fk').select('*').eq('household_id', householdId),
        supabase.from('expenses_riksnorm').select('*').eq('household_id', householdId)
    ]);

    const electricityRows = electricityRes.data ?? [];
    const fixed = fixedRes.data ?? [];
    const subscriptions = subscriptionsRes.data ?? [];
    const savingsRows = savingsRes.data ?? [];
    const allowance = allowanceRes.data ?? [];
    const kids = kidsRes.data ?? [];
    const unexpected = unexpectedRes.data ?? [];
    const extra = extraRes.data ?? [];
    const loans = loansRes.data ?? [];
    const expenses = expensesRes.data ?? [];
    const riksnorm = riksnormRes.data ?? [];

    const incomeMonths = incomeMonthsRes.data ?? [];
    const primary = primaryRes.data ?? [];
    const extraJobs = extraJobsRes.data ?? [];
    const fk = fkRes.data ?? [];

    // Robust YYYY-MM extraktion
    const toYM = (value: any) => {
        if (!value) return null;
        return String(value).slice(0, 7);
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

        const diff = (curY - startY) * 12 + (curM - startM);
        return diff >= 0 && diff % Number(row.interval_months ?? 1) === 0;
    };

    // Per person + shared – utan dubbelräkning
    const perUserOrShared = (rows: any[], ym: string) => {
        const active = rows.filter((r) => isActive(r, ym));
        const result: Record<string, number> = {};

        for (const member of memberList) {
            result[member.name] = active
                .filter((r) => {
                    if (r.owner && r.owner !== 'shared') return r.owner === member.id;
                    if (!r.owner && r.user_id) return r.user_id === member.id;
                    return false;
                })
                .reduce((a, r) => a + Number(r.amount ?? 0), 0);
        }

        result.shared = active
            .filter((r) => r.owner === 'shared')
            .reduce((a, r) => a + Number(r.amount ?? 0), 0);

        return result;
    };

    // ⭐ EL – summera eon_amount + tibber_amount per månad
    const electricityPerMonth = months.map((m) =>
        electricityRows
            .filter((e) => toYM(e.month) === m)
            .reduce(
                (acc, e) =>
                    acc +
                    Number(e.eon_amount ?? 0) +
                    Number(e.tibber_amount ?? 0),
                0
            )
    );

    // Fasta kostnader
    const fixedGroups = [...new Set(fixed.map((f) => f.cost_name as string))];

    const fixedPerGroup = Object.fromEntries(
        fixedGroups.map((name) => [
            name,
            months.map((m) =>
                fixed
                    .filter((f) => f.cost_name === name && isActive(f, m))
                    .reduce((acc, f) => acc + Number(f.amount ?? 0), 0)
            )
        ])
    );

    const ownerMap: Record<string, string> = {};
    for (const f of fixed) {
        const key = f.cost_name as string;
        if (!ownerMap[key]) ownerMap[key] = f.owner ?? f.user_id ?? 'shared';
    }

    // ⭐ Fasta kostnader Bistånd (expenses_riksnorm)
    const riksnormPerGroup = Object.fromEntries(
        [...new Set(riksnorm.map((f) => f.cost_name as string))].map((name) => [
            name,
            months.map((m) =>
                riksnorm
                    .filter((f) => f.cost_name === name && isActive(f, m))
                    .reduce((acc, f) => acc + Number(f.amount ?? 0), 0)
            )
        ])
    );

    // Abonnemang
    const subs = months.map((m) => perUserOrShared(subscriptions, m));

    // ⭐ SPARANDE – korrekt user_id‑baserad logik
    const savings = months.map((m) => {
        const result: Record<string, number> = {};

        for (const member of memberList) {
            result[member.name] = 0;
        }
        result.shared = 0;

        const active = savingsRows.filter((r) => {
            const start = toYM(r.start_month);
            const end = toYM(r.end_month);
            return start && start <= m && (!end || end >= m);
        });

        for (const row of active) {
            const amount = Number(row.amount ?? 0);

            if (row.owner === 'shared') {
                result.shared += amount;
            } else {
                const ownerMember = memberList.find((mem) => mem.id === row.owner);
                if (ownerMember) {
                    result[ownerMember.name] += amount;
                }
            }
        }

        return result;
    });

    // Fickpengar
    const allowanceUser = months.map((m) => {
        const active = allowance.filter((r) => isActive(r, m));
        const result: Record<string, number> = {};
        for (const member of memberList) {
            result[member.name] = active
                .filter((r) => r.user_id === member.id)
                .reduce((a, r) => a + Number(r.amount ?? 0), 0);
        }
        result.shared = 0;
        return result;
    });

    // Barn
    const childNames = [...new Set(kids.map((k) => k.child_name as string))];

    const kidsPerMonth = Object.fromEntries(
        childNames.map((name) => [
            name,
            months.map((m) =>
                kids
                    .filter((k) => k.child_name === name && isActive(k, m))
                    .reduce((acc, k) => acc + Number(k.amount ?? 0), 0)
            )
        ])
    );

    // Lån
    const loansPerMonth = months.map((m) => perUserOrShared(loans, m));

    // Oförutsägbara
    const unexpectedPerMonth = months.map((m) =>
        unexpected
            .filter((u) => toYM(u.date) === m)
            .reduce((acc, u) => acc + Number(u.amount ?? 0), 0)
    );

    // Extra inkomster
    const extraPerMonth = months.map((m) =>
        extra
            .filter((x) => toYM(x.date) === m)
            .reduce((acc, x) => acc + Number(x.amount ?? 0), 0)
    );

    // ⭐ INKOMSTER – per person och total hushåll
    const incomePerUser: Record<string, number[]> = {};
    for (const member of memberList) {
        incomePerUser[member.name] = months.map(() => 0);
    }

    const monthIdToYm = new Map<any, string>();
    for (const im of incomeMonths) {
        const ym = toYM(im.month_date);
        if (ym) monthIdToYm.set(im.id, ym);
    }

    const addIncome = (userId: any, income_month_id: any, amount: any) => {
        const ym = monthIdToYm.get(income_month_id);
        if (!ym) return;
        const idx = months.indexOf(ym);
        if (idx === -1) return;

        const member = memberList.find((m) => m.id === userId);
        if (!member) return;

        const val = Number(amount ?? 0);
        if (!Number.isFinite(val)) return;

        incomePerUser[member.name][idx] += val;
    };

    for (const row of primary) {
        addIncome(row.user_id, row.income_month_id, row.att_betala_ut);
    }

    for (const row of extraJobs) {
        addIncome(row.user_id, row.income_month_id, row.att_betala_ut);
    }

    for (const row of fk) {
        addIncome(row.user_id, row.income_month_id, row.att_betala_ut);
    }

    const incomeTotal = months.map((_, i) =>
        memberList.reduce(
            (sum, member) => sum + (incomePerUser[member.name]?.[i] ?? 0),
            0
        )
    );

    return {
        selectedYear,
        months,
        members: memberList,
        electricityPerMonth,
        fixedPerGroup,
        fixedGroups,
        riksnormPerGroup,
        ownerMap,
        subs,
        savings,
        allowanceUser,
        kidsPerMonth,
        loansPerMonth,
        unexpectedPerMonth,
        extraPerMonth,
        incomePerUser,
        incomeTotal
    };
};
