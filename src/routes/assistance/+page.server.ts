import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) redirect(303, '/login');

    if (!householdId) {
        return {
            months: [],
            incomeRows: [],
            rows: []
        };
    }

    // Hämta income_months
    const { data: incomeMonthsData } = await supabase
        .from('income_months')
        .select('id, month_date')
        .eq('household_id', householdId);

    if (!incomeMonthsData || incomeMonthsData.length === 0) {
        return { months: [], incomeRows: [], rows: [] };
    }

    // Sortera månader
    const sorted = incomeMonthsData
        .map((m) => ({ id: m.id, date: new Date(m.month_date) }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

    const last = sorted[sorted.length - 1].date;

    // Bygg 5 månader
    const months: string[] = [];
    for (let i = -3; i <= 1; i++) {
        const d = new Date(last);
        d.setMonth(d.getMonth() + i);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Returnera minimal data
    return {
        months,
        incomeRows: [],
        rows: []
    };
};
