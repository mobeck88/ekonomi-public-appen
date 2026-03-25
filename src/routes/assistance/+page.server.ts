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
            riksnorm: [],
            incomePerUser: {},
            incomeTotal: []
        };
    }

    // ⭐ Hämta hushållets medlemmar
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

    // ⭐ 5 månader: 3 bakåt, innevarande, nästa
    const today = new Date();
    const monthList: string[] = [];

    for (let offset = -3; offset <= 1; offset++) {
        const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthList.push(ym);
    }

    const selectedYear = today.getFullYear().toString();

    // ⭐ Hämta Fasta kostnader Bistånd
    const { data: riksnormRows } = await supabase
        .from('expenses_riksnorm')
        .select('*')
        .eq('household_id', householdId);

    const riksnormPerGroup = Object.fromEntries(
        [...new Set(riksnormRows?.map((f) => f.title) ?? [])].map((name) => [
            name,
            monthList.map((m) =>
                riksnormRows
                    ?.filter((f) => f.title === name && f.start_month <= m && (!f.end_month || f.end_month >= m))
                    .reduce((acc, f) => acc + Number(f.amount ?? 0), 0) ?? 0
            )
        ])
    );

    // ⭐ EL
    const { data: electricityRows } = await supabase
        .from('electricity')
        .select('*')
        .eq('household_id', householdId);

    const electricityPerMonth = monthList.map((m) =>
        electricityRows
            ?.filter((e) => String(e.month).slice(0, 7) === m)
            .reduce(
                (acc, e) =>
                    acc +
                    Number(e.eon_amount ?? 0) +
                    Number(e.tibber_amount ?? 0),
                0
            ) ?? 0
    );

    // ⭐ INKOMSTER (5 månader)
    const { data: incomeMonths } = await supabase
        .from('income_months')
        .select('id, month_date')
        .eq('household_id', householdId);

    const { data: primary } = await supabase
        .from('income_primary_job')
        .select('*')
        .eq('household_id', householdId);

    const { data: extraJobs } = await supabase
        .from('income_extra_jobs')
        .select('*')
        .eq('household_id', householdId);

    const { data: fk } = await supabase
        .from('income_fk')
        .select('*')
        .eq('household_id', householdId);

    const toYM = (v: any) => (v ? String(v).slice(0, 7) : null);

    const monthIdToYm = new Map<any, string>();
    for (const im of incomeMonths ?? []) {
        const ym = toYM(im.month_date);
        if (ym && monthList.includes(ym)) monthIdToYm.set(im.id, ym);
    }

    const incomePerUser: Record<string, number[]> = {};
    for (const member of memberList) {
        incomePerUser[member.name] = monthList.map(() => 0);
    }

    const addIncome = (userId: any, income_month_id: any, amount: any) => {
        const ym = monthIdToYm.get(income_month_id);
        if (!ym) return;

        const idx = monthList.indexOf(ym);
        if (idx === -1) return;

        const member = memberList.find((m) => m.id === userId);
        if (!member) return;

        incomePerUser[member.name][idx] += Number(amount ?? 0);
    };

    for (const row of primary ?? []) addIncome(row.user_id, row.income_month_id, row.att_betala_ut);
    for (const row of extraJobs ?? []) addIncome(row.user_id, row.income_month_id, row.att_betala_ut);
    for (const row of fk ?? []) addIncome(row.user_id, row.income_month_id, row.att_betala_ut);

    const incomeTotal = monthList.map((_, i) =>
        memberList.reduce(
            (sum, member) => sum + (incomePerUser[member.name]?.[i] ?? 0),
            0
        )
    );

    // ⭐ NY RIKSNORM-BERÄKNING
    const { data: household } = await supabase
        .from('households')
        .select('adults, children')
        .eq('id', householdId)
        .single();

    const { data: children } = await supabase
        .from('household_children')
        .select('birthdate')
        .eq('household_id', householdId);

    const { data: personalNorm } = await supabase
        .from('riksnorm_personal')
        .select('*')
        .eq('year', selectedYear);

    const { data: householdNorm } = await supabase
        .from('riksnorm_household')
        .select('*')
        .eq('year', selectedYear)
        .eq('household_size', (household?.adults ?? 0) + (household?.children ?? 0))
        .single();

    const adults = household?.adults ?? 0;
    const childAges = (children ?? []).map((c) => {
        const birth = new Date(c.birthdate);
        const end = new Date(Number(selectedYear), 11, 31);
        return end.getFullYear() - birth.getFullYear();
    });

    const adultRow = personalNorm?.find((r) => r.category === 'adult');
    const vuxenTotal = adultRow ? adultRow.amount * adults : 0;

    let barnTotal = 0;
    for (const age of childAges) {
        const row = personalNorm?.find(
            (r) => r.category === 'child' && r.age_min <= age && r.age_max >= age
        );
        if (row) barnTotal += row.amount;
    }

    const gemensamTotal = householdNorm?.amount ?? 0;

    const riksnorm = [
        { name: 'Vuxen', amount: vuxenTotal },
        { name: 'Barn', amount: barnTotal },
        { name: 'Gemensam', amount: gemensamTotal }
    ];

    return {
        selectedYear,
        months: monthList,
        members: memberList,
        electricityPerMonth,
        fixedPerGroup,
        riksnormPerGroup,
        riksnorm,
        incomePerUser,
        incomeTotal
    };
};
