import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
    const supabase = locals.supabase;
    const householdId = locals.householdId;

    const { year, month, field, value } = await request.json();

    if (!householdId) {
        return json({ error: 'Missing householdId' }, { status: 400 });
    }

    const { error } = await supabase
        .from('assistance_months')
        .upsert(
            {
                household_id: householdId,
                year,
                month,
                [field]: value
            },
            {
                onConflict: 'household_id,year,month'
            }
        );

    if (error) {
        console.error(error);
        return json({ error: error.message }, { status: 500 });
    }

    return json({ success: true });
}
