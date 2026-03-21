import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) return redirect(303, '/login');
    if (!householdId) return { months: [], rows: [], incomeRows: [] };

    // 1. HÄMTA MÅNADER
    const { data: monthsData } = await supabase
        .from('income_months')
        .select('id, month_date')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .order('month_date', { ascending: true });

    if (!monthsData || monthsData.length === 0) {
        return { months: [], rows: [], incomeRows: [] };
    }

    const sorted = monthsData.map((m) => ({
        id: m.id,
        date: new Date(m.month_date)
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    const last = sorted[sorted.length - 1].date;
    const months: string[] = [];

    for (let i = -3; i <= 1; i++) {
        const d = new Date(last);
        d.setMonth(d.getMonth() + i);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // 2. HÄMTA INKOMSTER
    const { data: primary } = await supabase
        .from('income_primary_job')
        .select('income_month_id, att_betala_ut');

    const { data: extra } = await supabase
        .from('income_extra_jobs')
        .select('income_month_id, att_betala_ut');

    const { data: fk } = await supabase
        .from('income_fk')
        .select('income_month_id, fk_typ, att_betala_ut');

    // Dynamiska inkomstrader
    const incomeRows = [...new Set(fk?.map((f) => f.fk_typ) ?? [])];

    // 3. HÄMTA UTGIFTER
    const { data: expenses } = await supabase
        .from('expenses')
        .select('income_month_id, category, amount');

    // 4. MAPPAR
    const monthIdMap = new Map<string, string>();
    sorted.forEach((m) => {
        const key = `${m.date.getFullYear()}-${String(m.date.getMonth() + 1).padStart(2, '0')}`;
        monthIdMap.set(key, m.id);
    });

    function emptyValues() {
        return months.map(() => 0);
    }

    const rows = new Map<string, number[]>();

    function add(label: string, month: string, amount: number) {
        if (!rows.has(label)) rows.set(label, emptyValues());
        const idx = months.indexOf(month);
        if (idx !== -1) rows.get(label)![idx] += amount;
    }

    // 5. FYLL IN INKOMSTER
    primary?.forEach((p) => {
        const month = [...monthIdMap.entries()].find(([, id]) => id === p.income_month_id)?.[0];
        if (month) add('Arbete', month, Number(p.att_betala_ut));
    });

    extra?.forEach((e) => {
        const month = [...monthIdMap.entries()].find(([, id]) => id === e.income_month_id)?.[0];
        if (month) add('Arbete', month, Number(e.att_betala_ut));
    });

    fk?.forEach((f) => {
        const month = [...monthIdMap.entries()].find(([, id]) => id === f.income_month_id)?.[0];
        if (!month) return;

        const val = Number(f.att_betala_ut);
        add(f.fk_typ, month, val);
    });

    // 6. FYLL IN UTGIFTER
    expenses?.forEach((ex) => {
        const month = [...monthIdMap.entries()].find(([, id]) => id === ex.income_month_id)?.[0];
        if (!month) return;
        add(ex.category, month, Number(ex.amount));
    });

    // 7. SUMMERINGAR
    function sumRow(labels: string[]) {
        const arr = emptyValues();
        labels.forEach((label) => {
            const r = rows.get(label);
            if (!r) return;
            r.forEach((v, i) => arr[i] += v);
        });
        return arr;
    }

    const sumIncome = sumRow([...incomeRows]);
    const sumExpenses = sumRow([
        'Hyra', 'El', 'Hemförsäkring', 'Mat vuxen', 'Mat barn',
        'Övriga kostnad barn', 'Internet', 'Facket', 'A-kassa (avgift)',
        'Barnomsorg', 'Sjukhuskostnader', 'Mediciner'
    ]);

    const balance = sumIncome.map((v, i) => v - sumExpenses[i]);

    // 8. SYSTEMRADER
    rows.set('Summa inkomst', sumIncome);
    rows.set('Summa utgifter', sumExpenses);
    rows.set('Balans', balance);
    rows.set('Biståndsmånad', emptyValues());
    rows.set('Kalendermånad', months);

    // 9. RETURNERA
    return {
        months,
        incomeRows,
        rows: [...rows.entries()].map(([label, values]) => ({ label, values }))
    };
};
