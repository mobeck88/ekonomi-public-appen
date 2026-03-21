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
            incomeRows: [],
            rows: []
        };
    }

    const selectedYear =
        url.searchParams.get('year') ?? new Date().getFullYear().toString();

    const months = Array.from({ length: 12 }, (_, i) => {
        const m = (i + 1).toString().padStart(2, '0');
        return `${selectedYear}-${m}`;
    });

    const [
        incomeMonthsRes,
        primaryRes,
        extraJobsRes,
        fkRes,
        expensesRes
    ] = await Promise.all([
        supabase
            .from('income_months')
            .select('id, month_date')
            .eq('household_id', householdId)
            .gte('month_date', `${selectedYear}-01-01`)
            .lte('month_date', `${selectedYear}-12-31`),
        supabase.from('income_primary_job').select('*').eq('household_id', householdId),
        supabase.from('income_extra_jobs').select('*').eq('household_id', householdId),
        supabase.from('income_fk').select('*').eq('household_id', householdId),
        supabase.from('expenses').select('*').eq('household_id', householdId)
    ]);

    const incomeMonths = incomeMonthsRes.data ?? [];
    const primary = primaryRes.data ?? [];
    const extraJobs = extraJobsRes.data ?? [];
    const fk = fkRes.data ?? [];
    const expenses = expensesRes.data ?? [];

    const toYM = (value: any) => {
        if (!value) return null;
        return String(value).slice(0, 7);
    };

    const monthIdToYm = new Map<any, string>();
    for (const im of incomeMonths) {
        const ym = toYM(im.month_date);
        if (ym) monthIdToYm.set(im.id, ym);
    }

    const emptyValues = () => months.map(() => 0);
    const rows = new Map<string, number[]>();

    const add = (label: string, ym: string | null, amount: any) => {
        if (!ym) return;
        const idx = months.indexOf(ym);
        if (idx === -1) return;
        if (!rows.has(label)) rows.set(label, emptyValues());
        const val = Number(amount ?? 0);
        if (!Number.isFinite(val)) return;
        rows.get(label)![idx] += val;
    };

    const incomeLabelSet = new Set<string>();
    incomeLabelSet.add('Arbete');

    // Arbete = primär + extra jobb
    for (const row of primary) {
        const ym = monthIdToYm.get(row.income_month_id);
        add('Arbete', ym, row.att_betala_ut);
    }

    for (const row of extraJobs) {
        const ym = monthIdToYm.get(row.income_month_id);
        add('Arbete', ym, row.att_betala_ut);
    }

    // FK – dynamiska rader
    for (const row of fk) {
        const ym = monthIdToYm.get(row.income_month_id);
        let label: string;

        if (row.fk_typ === 'Övrigt') {
            const desc = (row.beskrivning ?? '').trim();
            if (desc) {
                label = desc.length > 15 ? desc.slice(0, 15) : desc;
            } else {
                label = 'Övrig FK';
            }
        } else {
            label = row.fk_typ ?? 'Okänd FK';
        }

        incomeLabelSet.add(label);
        add(label, ym, row.att_betala_ut);
    }

    const incomeRows = Array.from(incomeLabelSet);

    // Utgifter – endast biståndsrelevanta
    const allowedExpenses = new Set<string>([
        'Hyra',
        'El',
        'Hemförsäkring',
        'Mat vuxen',
        'Mat barn',
        'Övriga kostnad barn',
        'Internet',
        'Facket',
        'A-kassa (avgift)',
        'Barnomsorg',
        'Sjukhuskostnader',
        'Mediciner'
    ]);

    for (const ex of expenses) {
        if (!allowedExpenses.has(ex.category)) continue;
        const ym = monthIdToYm.get(ex.income_month_id);
        add(ex.category, ym, ex.amount);
    }

    const sumRow = (labels: string[]) => {
        const arr = emptyValues();
        for (const label of labels) {
            const r = rows.get(label);
            if (!r) continue;
            r.forEach((v, i) => (arr[i] += v));
        }
        return arr;
    };

    const sumIncome = sumRow(incomeRows);
    const sumExpenses = sumRow(Array.from(allowedExpenses));
    const balance = sumIncome.map((v, i) => v - sumExpenses[i]);

    rows.set('Summa inkomst', sumIncome);
    rows.set('Summa utgifter', sumExpenses);
    rows.set('Balans', balance);

    const assistMonths = months.map((m) => {
        const [y, mm] = m.split('-').map(Number);
        const d = new Date(y, mm - 1);
        d.setMonth(d.getMonth() + 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    rows.set('Biståndsmånad', assistMonths as unknown as number[]);
    rows.set('Kalendermånad', months as unknown as number[]);

    return {
        selectedYear,
        months,
        incomeRows,
        rows: [...rows.entries()].map(([label, values]) => ({ label, values }))
    };
};
