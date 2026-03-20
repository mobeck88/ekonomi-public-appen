import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) {
        return redirect(303, '/login');
    }

    if (!householdId) {
        return { months: [] };
    }

    // Hämta de senaste 5 månaderna (inkl. nuvarande)
    const now = new Date();
    const monthsToLoad = [];

    for (let i = 0; i < 5; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsToLoad.push({
            year: d.getFullYear(),
            month: d.getMonth() + 1
        });
    }

    // Kör SQL-funktionen för varje månad
    for (const m of monthsToLoad) {
        const { error } = await supabase.rpc('update_assistance_month', {
            in_household_id: householdId,
            in_year: m.year,
            in_month: m.month
        });

        if (error) {
            console.error("ASSISTANCE UPDATE ERROR:", error);
        }
    }

    // Hämta resultatet från assistance_months
    const { data: months, error } = await supabase
        .from('assistance_months')
        .select(`
            id,
            household_id,
            year,
            month,
            total_income,
            total_expenses,
            correction_income,
            correction_expense,
            soc_decision_balance,
            soc_decision_notes,
            created_at,
            updated_at
        `)
        .eq('household_id', householdId)
        .in('month', monthsToLoad.map(m => m.month))
        .in('year', monthsToLoad.map(m => m.year))
        .order('year', { ascending: false })
        .order('month', { ascending: false });

    if (error) {
        console.error("ASSISTANCE LOAD ERROR:", error);
        return { months: [] };
    }

    return { months };
};

export const actions: Actions = {
    save: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) return redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const form = await request.formData();

        const id = form.get('id');
        const correction_income = Number(form.get('correction_income'));
        const correction_expense = Number(form.get('correction_expense'));
        const soc_decision_balance = Number(form.get('soc_decision_balance'));
        const soc_decision_notes = form.get('soc_decision_notes') as string;

        const { error } = await supabase
            .from('assistance_months')
            .update({
                correction_income,
                correction_expense,
                soc_decision_balance,
                soc_decision_notes,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) {
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
