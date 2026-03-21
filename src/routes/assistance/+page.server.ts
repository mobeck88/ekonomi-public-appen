import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) return redirect(303, '/login');

    if (!householdId) {
        return {
            months: [],
            incomeRows: [],
            rows: []
        };
    }

    // 1. Hämta alla income_months för hushållet
    const { data: incomeMonthsData } = await supabase
        .from('income_months')
        .select('id, month_date')
        .eq('household_id', householdId);

    if (!incomeMonthsData || incomeMonthsData.length === 0) {
        return { months: [], incomeRows: [], rows: [] };
    }

    // 2. Sortera månader
    const sorted = incomeMonthsData
        .map((m) => ({ id: m.id, date: new Date(m.month_date) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    // 3. Ta senaste månaden
    const last = sorted[sorted.length - 1].date;

    // 4. Bygg 5-månaderslistan: M-3 → M+1
    const months: string[] = [];
    for (let i = -3; i <= 1; i++) {
        const d = new Date(last);
        d.setMonth(d.getMonth() + i);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // 5. Hämta inkomster och utgifter
    const [
        primaryRes,
        extraJobsRes,
        fkRes,
        expensesRes
    ] = await Promise.all([
        supabase.from('income_primary_job').select('*').eq('household_id', householdId),
        supabase.from('income_extra_jobs').select('*').eq('household_id', householdId),
        supabase.from('income_fk').select('*').eq('household_id', householdId),
        supabase.from('expenses').select('*').eq('household_id', householdId)
    ]);

    const primary = primaryRes.data ?? [];
    const extraJobs = extraJobsRes.data ?? [];
    const fk = fkRes.data ?? [];
    const expenses = expensesRes.data ?? [];

    // 6. Mappa income_month_id → YYYY-MM
    const toYM = (value: any) => {
        if (!value) return null;
        return String(value).slice(0, 7);
    };

    const monthIdToYm = new Map<any, string>();
    for (const im of incomeMonthsData) {
        const ym = toYM(im.month_date);
        if (ym) monthIdToYm.set(im.id, ym);
    }

    // 7. Rows-map
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

    // 8. Inkomster
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

    // 9. Utgifter – endast biståndsrelevanta
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

    // 10. Summeringar
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

    // 11. Biståndsmånad = kalendermånad + 1
    const assistMonths = months.map((m) => {
        const [y, mm] = m.split('-').map(Number);
        const d = new Date(y, mm - 1);
        d.setMonth(d.getMonth() + 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    rows.set('Biståndsmånad', assistMonths as unknown as number[]);
    rows.set('Kalendermånad', months as unknown as number[]);

    return {
        months,
        incomeRows,
        rows: [...rows.entries()].map(([label, values]) => ({ label, values }))
    };
};
