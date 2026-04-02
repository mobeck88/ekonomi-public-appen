import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
    const supabase = locals.supabase;
    const householdId = locals.householdId;

    if (!householdId) {
        return json({ success: false, error: 'No household' }, { status: 400 });
    }

    const { type, month, amount } = await request.json();

    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const m = Number(monthStr);

    // Hämta befintlig rad
    const { data: existing } = await supabase
        .from('assistance_months')
        .select('*')
        .eq('household_id', householdId)
        .eq('year', year)
        .eq('month', m)
        .maybeSingle();

    const payload: any = {
        household_id: householdId,
        year,
        month: m,
        total_income: existing?.total_income ?? 0,
        total_expenses: existing?.total_expenses ?? 0,
        correction_income: existing?.correction_income ?? 0,
        correction_expense: existing?.correction_expense ?? 0
    };

    if (type === 'income') {
        payload.correction_income = amount;
    } else {
        payload.correction_expense = amount;
    }

    await supabase
        .from('assistance_months')
        .upsert(payload, { onConflict: 'household_id,year,month' });

    return json({ success: true });
}
