import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

function ageAtMonth(birthdate: string, year: number, month: number) {
    const b = new Date(birthdate);
    const d = new Date(year, month - 1, 1);
    let age = d.getFullYear() - b.getFullYear();
    if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) {
        age--;
    }
    return age;
}

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, '/login');

    if (!householdId) {
        return {
            months: [],
            incomeRows: [],
            rows: []
        };
    }

    const { data: incomeMonthsDataRaw } = await supabase
        .from('income_months')
        .select('id, month_date')
        .eq('household_id', householdId);

    if (!incomeMonthsDataRaw || incomeMonthsDataRaw.length === 0) {
        return { months: [], incomeRows: [], rows: [] };
    }

    const incomeMonthsData = incomeMonthsDataRaw.map((m) => ({
        id: m.id,
        month_date:
            typeof m.month_date === 'string'
                ? m.month_date.slice(0, 10)
                : new Date(m.month_date).toISOString().slice(0, 10)
    }));

    const sorted = incomeMonthsData
        .map((m) => ({ id: m.id, date: m.month_date }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const last = sorted[sorted.length - 1].date;

    const months: string[] = [];
    for (let i = -3; i <= 1; i++) {
        const d = new Date(last);
        d.setMonth(d.getMonth() + i);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const [
        primaryRes,
        extraJobsRes,
        fkRes,
        expensesRes,
        assistanceRes,
        householdRes,
        childrenRes,
        rnPersonalRes,
        rnHouseholdRes
    ] = await Promise.all([
        supabase.from('income_primary_job').select('*').eq('household_id', householdId),
        supabase.from('income_extra_jobs').select('*').eq('household_id', householdId),
        supabase.from('income_fk').select('*').eq('household_id', householdId),
        supabase.from('expenses').select('*').eq('household_id', householdId),
        supabase.from('assistance_months').select('*').eq('household_id', householdId),
        supabase.from('households').select('*').eq('id', householdId),
        supabase.from('households_children').select('*').eq('household_id', householdId),
        supabase.from('riksnorm_personal').select('*'),
        supabase.from('riksnorm_household').select('*')
    ]);

    const primary = primaryRes.data ?? [];
    const extraJobs = extraJobsRes.data ?? [];
    const fk = fkRes.data ?? [];
    const expenses = expensesRes.data ?? [];
    const assistanceMonths = assistanceRes.data ?? [];
    const household = householdRes.data?.[0] ?? null;
    const children = childrenRes.data ?? [];
    const rnPersonal = rnPersonalRes.data ?? [];
    const rnHousehold = rnHouseholdRes.data ?? [];

    const toYM = (value: any) => {
        if (!value) return null;
        return String(value).slice(0, 7);
    };

    const monthIdToYm: Record<string, string> = {};
    for (const im of incomeMonthsData) {
        const ym = toYM(im.month_date);
        if (ym) monthIdToYm[im.id] = ym;
    }

    const emptyValues = () => months.map(() => 0);

    const rowsObj: Record<string, number[] | string[]> = {};

    const add = (label: string, ym: string | null, amount: any) => {
        if (!ym) return;
        const idx = months.indexOf(ym);
        if (idx === -1) return;
        if (!rowsObj[label]) rowsObj[label] = emptyValues();
        const val = Number(amount ?? 0);
        if (!Number.isFinite(val)) return;
        (rowsObj[label] as number[])[idx] += val;
    };

    const incomeLabelSet = new Set<string>();
    incomeLabelSet.add('Arbete');

    for (const row of primary) {
        add('Arbete', monthIdToYm[row.income_month_id], row.att_betala_ut);
    }

    for (const row of extraJobs) {
        add('Arbete', monthIdToYm[row.income_month_id], row.att_betala_ut);
    }

    for (const row of fk) {
        const ym = monthIdToYm[row.income_month_id];

        let label: string;

        if (row.fk_typ === 'Övrigt') {
            const desc = (row.beskrivning ?? '').trim();
            label = desc ? (desc.length > 15 ? desc.slice(0, 15) : desc) : 'Övrig FK';
        } else {
            label = row.fk_typ ?? 'Okänd FK';
        }

        incomeLabelSet.add(label);
        add(label, ym, row.att_betala_ut);
    }

    const incomeRows = Array.from(incomeLabelSet);

    const allowedExpenses = new Set<string>([
        'Hyra','El','Hemförsäkring','Mat vuxen','Mat barn',
        'Övriga kostnad barn','Internet','Facket','A-kassa (avgift)',
        'Barnomsorg','Sjukhuskostnader','Mediciner'
    ]);

    for (const ex of expenses) {
        if (!allowedExpenses.has(ex.category)) continue;
        add(ex.category, monthIdToYm[ex.income_month_id], ex.amount);
    }

    const assistanceMap: Record<string, any> = {};
    for (const row of assistanceMonths) {
        const ym = `${row.year}-${String(row.month).padStart(2, '0')}`;
        assistanceMap[ym] = row;
    }

    const incomeCorrection = emptyValues();
    const expenseCorrection = emptyValues();

    months.forEach((m, idx) => {
        const row = assistanceMap[m];
        if (!row) return;
        incomeCorrection[idx] = Number(row.correction_income ?? 0);
        expenseCorrection[idx] = Number(row.correction_expense ?? 0);
    });

    rowsObj['Korrigering inkomst'] = incomeCorrection;
    rowsObj['Korrigering utgift'] = expenseCorrection;

    const riksnormVuxen = emptyValues();
    const riksnormBarn = emptyValues();
    const riksnormHushall = emptyValues();

    const adults = household?.adults ?? 0;
    const childrenCount = household?.children ?? 0;
    const totalPersons = adults + childrenCount;

    months.forEach((m, idx) => {
        const [yearStr, monthStr] = m.split('-').map(Number);
        const d = new Date(yearStr, monthStr - 1);
        d.setMonth(d.getMonth() + 1);

        const year = d.getFullYear();
        const month = d.getMonth() + 1;

        const adultNorm = rnPersonal.find((r) => r.year === year && r.category === 'adult');
        const adultAmount = Number(adultNorm?.amount ?? 0);
        riksnormVuxen[idx] = adults * adultAmount;

        let childTotal = 0;
        for (const child of children) {
            const age = ageAtMonth(child.birthdate, year, month);
            const childNorm = rnPersonal.find(
                (r) =>
                    r.year === year &&
                    r.category === 'child' &&
                    r.age_min !== null &&
                    r.age_max !== null &&
                    age >= r.age_min &&
                    age <= r.age_max
            );
            if (childNorm) {
                childTotal += Number(childNorm.amount ?? 0);
            }
        }
        riksnormBarn[idx] = childTotal;

        const hhNorm = rnHousehold.find(
            (r) => r.year === year && r.household_size === totalPersons
        );
        riksnormHushall[idx] = Number(hhNorm?.amount ?? 0);
    });

    rowsObj['Riksnorm vuxen'] = riksnormVuxen;
    rowsObj['Riksnorm barn'] = riksnormBarn;
    rowsObj['Riksnorm hushåll'] = riksnormHushall;

    const sumRow = (labels: string[]) => {
        const arr = emptyValues();
        for (const label of labels) {
            const r = rowsObj[label];
            if (!r) continue;
            (r as number[]).forEach((v, i) => (arr[i] += v));
        }
        return arr;
    };

    const sumIncome = sumRow([...incomeRows, 'Korrigering inkomst']);

    const expenseSumLabels = [
        ...Array.from(allowedExpenses),
        'Riksnorm vuxen',
        'Riksnorm barn',
        'Riksnorm hushåll',
        'Korrigering utgift'
    ];

    const sumExpenses = sumRow(expenseSumLabels);
    const balance = sumIncome.map((v, i) => v - sumExpenses[i]);

    rowsObj['Summa inkomst'] = sumIncome;
    rowsObj['Summa utgifter'] = sumExpenses;
    rowsObj['Balans'] = balance;

    const assistMonths = months.map((m) => {
        const [y, mm] = m.split('-').map(Number);
        const d = new Date(y, mm - 1);
        d.setMonth(d.getMonth() + 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    rowsObj['Biståndsmånad'] = assistMonths;
    rowsObj['Kalendermånad'] = months;

    return {
        months,
        incomeRows,
        rows: Object.entries(rowsObj).map(([label, values]) => ({ label, values }))
    };
};
 