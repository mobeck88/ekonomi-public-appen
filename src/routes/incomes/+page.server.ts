import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------
// GET — Hämta alla inkomster för ett hushåll och månad
// ---------------------------------------------------------
export const GET: RequestHandler = async ({ url, locals }) => {
    const user = locals.user;
    if (!user) throw error(401, 'Not authenticated');

    const householdId = url.searchParams.get('householdId');
    const monthDate = url.searchParams.get('monthDate');

    if (!householdId || !monthDate) {
        throw error(400, 'householdId och monthDate krävs');
    }

    const { data, error: dbError } = await supabase
        .from('income_months')
        .select(`
            id,
            month_date,
            income_primary_job (*),
            income_extra_jobs (*),
            income_fk (*),
            income_insurance (*)
        `)
        .eq('household_id', householdId)
        .eq('month_date', monthDate)
        .eq('user_id', user.id)
        .single();

    if (dbError) throw error(500, dbError.message);

    return json(data);
};

// ---------------------------------------------------------
// POST — Skapa en income_month + ev. underposter
// ---------------------------------------------------------
export const POST: RequestHandler = async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw error(401, 'Not authenticated');

    const body = await request.json();
    const { household_id, month_date, primary_job, extra_jobs, fk, insurance } = body;

    if (!household_id || !month_date) {
        throw error(400, 'household_id och month_date krävs');
    }

    // 1. Skapa income_month
    const { data: monthRow, error: monthError } = await supabase
        .from('income_months')
        .insert({
            household_id,
            user_id: user.id,
            month_date
        })
        .select()
        .single();

    if (monthError) throw error(500, monthError.message);

    const incomeMonthId = monthRow.id;

    // 2. Skapa primary job (om finns)
    if (primary_job) {
        const { error: pjError } = await supabase
            .from('income_primary_job')
            .insert({
                ...primary_job,
                income_month_id: incomeMonthId,
                household_id,
                user_id: user.id
            });

        if (pjError) throw error(500, pjError.message);
    }

    // 3. Extra jobs
    if (extra_jobs?.length) {
        const rows = extra_jobs.map((j: any) => ({
            ...j,
            income_month_id: incomeMonthId,
            household_id,
            user_id: user.id
        }));

        const { error: ejError } = await supabase
            .from('income_extra_jobs')
            .insert(rows);

        if (ejError) throw error(500, ejError.message);
    }

    // 4. FK
    if (fk) {
        const { error: fkError } = await supabase
            .from('income_fk')
            .insert({
                ...fk,
                income_month_id: incomeMonthId,
                household_id,
                user_id: user.id
            });

        if (fkError) throw error(500, fkError.message);
    }

    // 5. Insurance
    if (insurance) {
        const { error: insError } = await supabase
            .from('income_insurance')
            .insert({
                ...insurance,
                income_month_id: incomeMonthId,
                household_id,
                user_id: user.id
            });

        if (insError) throw error(500, insError.message);
    }

    return json({ success: true, id: incomeMonthId });
};

// ---------------------------------------------------------
// PUT — Uppdatera income_month + underposter
// ---------------------------------------------------------
export const PUT: RequestHandler = async ({ request, locals }) => {
    const user = locals.user;
    if (!user) throw error(401, 'Not authenticated');

    const body = await request.json();
    const { id, month_date, primary_job, extra_jobs, fk, insurance } = body;

    if (!id) throw error(400, 'id krävs');

    // 1. Uppdatera income_month
    const { error: monthError } = await supabase
        .from('income_months')
        .update({ month_date })
        .eq('id', id)
        .eq('user_id', user.id);

    if (monthError) throw error(500, monthError.message);

    // 2. Primary job
    if (primary_job) {
        const { error: pjError } = await supabase
            .from('income_primary_job')
            .update(primary_job)
            .eq('income_month_id', id)
            .eq('user_id', user.id);

        if (pjError) throw error(500, pjError.message);
    }

    // 3. Extra jobs — radera och lägg in igen (enklast och säkrast)
    if (extra_jobs) {
        await supabase
            .from('income_extra_jobs')
            .delete()
            .eq('income_month_id', id)
            .eq('user_id', user.id);

        if (extra_jobs.length) {
            const rows = extra_jobs.map((j: any) => ({
                ...j,
                income_month_id: id,
                user_id: user.id
            }));

            const { error: ejError } = await supabase
                .from('income_extra_jobs')
                .insert(rows);

            if (ejError) throw error(500, ejError.message);
        }
    }

    // 4. FK
    if (fk) {
        const { error: fkError } = await supabase
            .from('income_fk')
            .update(fk)
            .eq('income_month_id', id)
            .eq('user_id', user.id);

        if (fkError) throw error(500, fkError.message);
    }

    // 5. Insurance
    if (insurance) {
        const { error: insError } = await supabase
            .from('income_insurance')
            .update(insurance)
            .eq('income_month_id', id)
            .eq('user_id', user.id);

        if (insError) throw error(500, insError.message);
    }

    return json({ success: true });
};

// ---------------------------------------------------------
// DELETE — Ta bort income_month + alla underposter
// ---------------------------------------------------------
export const DELETE: RequestHandler = async ({ url, locals }) => {
    const user = locals.user;
    if (!user) throw error(401, 'Not authenticated');

    const id = url.searchParams.get('id');
    if (!id) throw error(400, 'id krävs');

    // Radera underposter först
    await supabase.from('income_primary_job').delete().eq('income_month_id', id).eq('user_id', user.id);
    await supabase.from('income_extra_jobs').delete().eq('income_month_id', id).eq('user_id', user.id);
    await supabase.from('income_fk').delete().eq('income_month_id', id).eq('user_id', user.id);
    await supabase.from('income_insurance').delete().eq('income_month_id', id).eq('user_id', user.id);

    // Radera income_month
    const { error: delError } = await supabase
        .from('income_months')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

    if (delError) throw error(500, delError.message);

    return json({ success: true });
};
