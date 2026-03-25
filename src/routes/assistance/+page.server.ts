import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
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
            riksnormPerGroup: {},
            extraPerMonth: [],
            incomePerUser: {},
            incomeTotal: [],
            riksnorm: {
                Vuxen: [],
                Barn: [],
                Gemensam: []
            }
        };
    }

    // Hämta hushållets medlemmar + roll
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id, role, profiles(full_name)')
        .eq('household_id', householdId);

    const memberList =
        members
            ?.filter((m) => m.role !== 'guardian')
            .map((m) => ({
                id: m.user_id,
                name: m.profiles.full_name
            })) ?? [];

    // 5 månader: 3 bakåt, innevarande, nästa
    const today = new Date();
    const monthInfos: { ym: string; year: number }[] = [];

    for (let offset = -3; offset <= 1; offset++) {
        const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        monthInfos.push({ ym: `${year}-${month}`, year });
    }

    const months = monthInfos.map((m) => m.ym);
    const selectedYear = String(today.getFullYear());

    // Hämta alla tabeller
    const minYear = Math.min(...monthInfos.map((m) => m.year));
    const maxYear = Math.max(...monthInfos.map((m) => m.year));

    const [
        electricityRes,
        extraRes,
        incomeMonthsRes,
        primaryRes,
        extraJobsRes,
        fkRes,
        riksnormExpensesRes
    ] = await Promise.all([
        supabase.from('electricity').select('*').eq('household_id', householdId),
        supabase.from('extra_income').select('*').eq('household_id', householdId),
        supabase
            .from('income_months')
            .select('id, month_date')
            .eq('household_id', householdId)
            .gte('month_date', `${minYear}-01-01`)
            .lte('month_date', `${maxYear}-12-31`),
        supabase.from('income_primary_job').select('*').eq('household_id', householdId),
        supabase.from('income_extra_jobs').select('*').eq('household_id', householdId),
        supabase.from('income_fk').select('*').eq('household_id', householdId),
        supabase.from('expenses_riksnorm').select('*').eq('household_id', householdId)
    ]);

    const electricityRows = electricityRes.data ?? [];
    const extra = extraRes.data ?? [];
    const incomeMonths = incomeMonthsRes.data ?? [];
    const primary = primaryRes.data ?? [];
    const extraJobs = extraJobsRes.data ?? [];
    const fk = fkRes.data ?? [];
    const riksnormExpenses = riksnormExpensesRes.data ?? [];

    const toYM = (value: any) => {
        if (!value) return null;
        return String(value).slice(0, 7);
    };

    const isActive = (row: any, ym: string) => {
        const start = toYM(row.start_month ?? row.start_date);
        const end = toYM(row.end_month ?? row.end_date);
        return start && start <= ym && (!end || end >= ym);
    };

    // EL
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

    // Fasta kostnader Bistånd (expenses_riksnorm)
    const riksnormPerGroup = Object.fromEntries(
        [...new Set(riksnormExpenses.map((f) => f.title as string))].map((name) => [
            name,
            months.map((m) =>
                riksnormExpenses
                    .filter((f) => f.title === name && isActive(f, m))
                    .reduce((acc, f) => acc + Number(f.amount ?? 0), 0)
            )
        ])
    );

    // Extra inkomster per månad
    const extraPerMonth = months.map((m) =>
        extra
            .filter((x) => toYM(x.date) === m)
            .reduce((acc, x) => acc + Number(x.amount ?? 0), 0)
    );

    // INKOMSTER – per person och total hushåll
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

    // RIKSNORM (Vuxen, Barn, Gemensam) per månad
    const { data: household } = await supabase
        .from('households')
        .select('adults, children')
        .eq('id', householdId)
        .single();

    const { data: children } = await supabase
        .from('household_children')
        .select('birthdate')
        .eq('household_id', householdId);

    const yearsSet = [...new Set(monthInfos.map((m) => m.year))];

    const riksnormByYear = new Map<
        number,
        { vuxen: number; barn: number; gemensam: number }
    >();

    for (const year of yearsSet) {
        const { data: personalNorm } = await supabase
            .from('riksnorm_personal')
            .select('*')
            .eq('year', String(year));

        const { data: householdNorm } = await supabase
            .from('riksnorm_household')
            .select('*')
            .eq('year', String(year))
            .eq(
                'household_size',
                (household?.adults ?? 0) + (household?.children ?? 0)
            )
            .single();

        const adults = household?.adults ?? 0;

        const childAges = (children ?? []).map((c) => {
            const birth = new Date(c.birthdate);
            const end = new Date(year, 11, 31);
            return end.getFullYear() - birth.getFullYear();
        });

        const adultRow = personalNorm?.find((r) => r.category === 'adult');
        const vuxenTotal = adultRow ? Number(adultRow.amount ?? 0) * adults : 0;

        let barnTotal = 0;
        for (const age of childAges) {
            const row = personalNorm?.find(
                (r) =>
                    r.category === 'child' &&
                    r.age_min <= age &&
                    r.age_max >= age
            );
            if (row) barnTotal += Number(row.amount ?? 0);
        }

        const gemensamTotal = Number(householdNorm?.amount ?? 0);

        riksnormByYear.set(year, {
            vuxen: vuxenTotal,
            barn: barnTotal,
            gemensam: gemensamTotal
        });
    }

    const riksnorm = {
        Vuxen: monthInfos.map(
            (m) => riksnormByYear.get(m.year)?.vuxen ?? 0
        ),
        Barn: monthInfos.map(
            (m) => riksnormByYear.get(m.year)?.barn ?? 0
        ),
        Gemensam: monthInfos.map(
            (m) => riksnormByYear.get(m.year)?.gemensam ?? 0
        )
    };

    return {
        selectedYear,
        months,
        members: memberList,
        electricityPerMonth,
        riksnormPerGroup,
        extraPerMonth,
        incomePerUser,
        incomeTotal,
        riksnorm
    };
};
