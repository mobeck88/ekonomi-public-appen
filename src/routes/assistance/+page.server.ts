import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) return redirect(303, '/login');
    if (!householdId) return { months: [], rows: [], incomeRows: [] };

    // 1. HÄMTA HUSHÅLLSMEDLEMMAR
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', householdId);

    const memberIds = members?.map(m => m.user_id) ?? [];

    // 2. HÄMTA MÅNADER
    const { data: monthsData } = await supabase
        .from('income_months')
        .select('id, month_date')
        .eq('household_id', householdId)
        .order('month_date', { ascending: true });

    if (!monthsData || monthsData.length === 0) {
        return { months: [], rows: [], incomeRows: [] };
    }

    const sorted = monthsData
        .map((m) => ({ id: m.id, date: new Date(m.month_date) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const last = sorted[sorted.length - 1].date;
    const months: string[] = [];

    for (let i = -3; i <= 1; i++) {
        const d = new Date(last);
        d.setMonth(d.getMonth() + i);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // 3. HÄMTA INKOMSTER FÖR HELA HUSHÅLLET
    const { data: primary } = await supabase
        .from('income_primary_job')
        .select('income_month_id, att_betala_ut, user_id')
        .in('user_id', memberIds);

    const { data: extra } = await supabase
        .from('income_extra_jobs')
        .select('income_month_id, att_betala_ut, user_id')
        .in('user_id', memberIds);

    const { data: fk } = await supabase
        .from('income_fk')
        .select('income_month_id, fk_typ, att_betala_ut, user_id')
        .in('user_id', memberIds);

    // 4. HÄMTA UTGIFTER FÖR HELA HUSHÅLLET
    const { data: expenses } = await supabase
        .from('expenses')
        .select('income_month_id, category, amount, user_id')
        .in('user_id', memberIds);

    // 5. MAPPAR
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

    // 6. FYLL IN INKOMSTER
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

        switch (f.fk_typ) {
            case 'A-kassa': add('A-kassa', month, val); break;
            case 'Föräldrapenning': add('Dagersättning (FP)', month, val); break;
            case 'VAB': add('Dagersättning (VAB)', month, val); break;
            case 'Sjukpenning': add('Sjukersättning', month, val); break;
            case 'Bostadsbidrag': add('Bostadsbidrag', month, val); break;
            case 'Underhållsstöd': add('Underhållsbidrag', month, val); break;
            default: add('Övriga insättningar', month, val); break;
        }
    });

    // 7. FYLL IN UTGIFTER
    expenses?.forEach((ex) => {
        const month = [...monthIdMap.entries()].find(([, id]) => id === ex.income_month_id)?.[0];
        if (!month) return;
        add(ex.category, month, Number(ex.amount));
    });

    // 8. SUMMERINGAR
    const incomeRows = [
        'Arbete','A-kassa','Försörjningsstöd','Barnbidrag','Bostadsbidrag',
        'Underhållsbidrag','Dagersättning (FP)','Dagersättning (VAB)',
        'Sjukersättning','Övriga insättningar','Överskridande överskott'
    ];

    function sumRow(labels: string[]) {
        const arr = emptyValues();
        labels.forEach((label) => {
            const r = rows.get(label);
            if (!r) return;
            r.forEach((v, i) => arr[i] += v);
        });
        return arr;
    }

    const sumIncome = sumRow(incomeRows);

    const sumExpenses = sumRow([
        'Hyra','El','Hemförsäkring','Mat vuxen','Mat barn',
        'Övriga kostnad barn','Internet','Facket','A-kassa (avgift)',
        'Barnomsorg','Sjukhuskostnader','Mediciner'
    ]);

    const balance = sumIncome.map((v, i) => v - sumExpenses[i]);

    // 9. SYSTEMRADER
    rows.set('Summa inkomst', sumIncome);
    rows.set('Summa utgifter', sumExpenses);
    rows.set('Balans', balance);

    // Biståndsmånad = kalendermånad + 1
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
