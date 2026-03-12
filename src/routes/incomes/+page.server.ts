import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

// ✔ Supabase-klient som fungerar i Vercel Edge + Supabase V2
function sb(session: any) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${session?.access_token ?? ''}`
            }
        }
    });
}

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const session = locals.session;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { months: [] };

    const supabase = sb(session);

    // Hämta månader
    const { data: months, error: monthsError } = await supabase
        .from('income_months')
        .select('*')
        .eq('household_id', householdId)
        .order('month', { ascending: false });

    if (monthsError || !months) return { months: [] };

    // Hämta relaterade tabeller
    const { data: primary } = await supabase.from('income_primary_job').select('*');
    const { data: extra } = await supabase.from('income_extra_jobs').select('*');
    const { data: fk } = await supabase.from('income_fk').select('*');

    // Slå ihop allt
    const enriched = months.map((m) => ({
        ...m,
        primary_job: primary?.find((p) => p.income_month_id === m.id) ?? null,
        extra_jobs: extra?.filter((e) => e.income_month_id === m.id) ?? [],
        fk: fk?.find((f) => f.income_month_id === m.id) ?? null
    }));

    return { months: enriched };
};

export const actions: Actions = {
    // ⭐ Skapa ny inkomst
    create_income: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const session = locals.session;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Saknar hushåll' });

        const supabase = sb(session);
        const form = await request.formData();

        // Månad
        const rawMonth = form.get('month') as string | null;
        if (!rawMonth) return fail(400, { message: 'Månad saknas' });
        const month = `${rawMonth}-01`;

        // Skapa income_month
        const { data: monthRow, error: monthError } = await supabase
            .from('income_months')
            .insert({
                household_id: householdId,
                user_id: user.id,
                month
            })
            .select('id')
            .single();

        if (monthError || !monthRow) return fail(400, { message: monthError?.message });

        const income_month_id = monthRow.id;

        // ⭐ Ordinarie arbete
        const primaryPayload = {
            income_month_id,
            user_id: user.id,
            lon_fore_skatt: form.get('primary_lon_fore_skatt') || null,
            franvaro: form.get('primary_franvaro') || null,
            inbetald_skatt: form.get('primary_inbetald_skatt') || null,
            frivillig_skatt: form.get('primary_frivillig_skatt') || null,
            att_betala_ut: form.get('primary_att_betala_ut') || null
        };

        const hasPrimary = Object.values(primaryPayload).some((v) => v && v !== income_month_id && v !== user.id);

        if (hasPrimary) {
            const { error: primaryError } = await supabase.from('income_primary_job').insert(primaryPayload);
            if (primaryError) return fail(400, { message: primaryError.message });
        }

        // ⭐ Extra jobb
        const arbetsgivareArr = form.getAll('extra_arbetsgivare') as string[];
        const lonArr = form.getAll('extra_lon_fore_skatt') as string[];
        const franvaroArr = form.getAll('extra_franvaro') as string[];
        const inbetaldArr = form.getAll('extra_inbetald_skatt') as string[];
        const frivilligArr = form.getAll('extra_frivillig_skatt') as string[];
        const attBetalaArr = form.getAll('extra_att_betala_ut') as string[];

        const extraRows = arbetsgivareArr
            .map((arbetsgivare, i) => ({
                income_month_id,
                user_id: user.id,
                arbetsgivare: arbetsgivare || null,
                lon_fore_skatt: lonArr[i] || null,
                franvaro: franvaroArr[i] || null,
                inbetald_skatt: inbetaldArr[i] || null,
                frivillig_skatt: frivilligArr[i] || null,
                att_betala_ut: attBetalaArr[i] || null
            }))
            .filter((row) => Object.values(row).some((v) => v && v !== income_month_id && v !== user.id));

        if (extraRows.length > 0) {
            const { error: extraError } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (extraError) return fail(400, { message: extraError.message });
        }

        // ⭐ Försäkringskassan
        const fkPayload = {
            income_month_id,
            user_id: user.id,
            ersattning_fore_skatt: form.get('fk_ersattning_fore_skatt') || null,
            inbetald_skatt: form.get('fk_inbetald_skatt') || null,
            att_betala_ut: form.get('fk_att_betala_ut') || null
        };

        const hasFk = Object.values(fkPayload).some((v) => v && v !== income_month_id && v !== user.id);

        if (hasFk) {
            const { error: fkError } = await supabase.from('income_fk').insert(fkPayload);
            if (fkError) return fail(400, { message: fkError.message });
        }

        throw redirect(303, '/incomes');
    },

    // ⭐ Uppdatera befintlig inkomst
    update_income: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const session = locals.session;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Saknar hushåll' });

        const supabase = sb(session);
        const form = await request.formData();

        const income_month_id = form.get('income_month_id') as string | null;
        if (!income_month_id) return fail(400, { message: 'Saknar income_month_id' });

        // Uppdatera månad
        const rawMonth = form.get('month') as string | null;
        if (rawMonth) {
            const month = `${rawMonth}-01`;
            const { error: monthError } = await supabase
                .from('income_months')
                .update({ month })
                .eq('id', income_month_id)
                .eq('household_id', householdId);
            if (monthError) return fail(400, { message: monthError.message });
        }

        // ⭐ Ordinarie arbete
        const primaryPayload = {
            lon_fore_skatt: form.get('primary_lon_fore_skatt') || null,
            franvaro: form.get('primary_franvaro') || null,
            inbetald_skatt: form.get('primary_inbetald_skatt') || null,
            frivillig_skatt: form.get('primary_frivillig_skatt') || null,
            att_betala_ut: form.get('primary_att_betala_ut') || null
        };

        const { data: existingPrimary } = await supabase
            .from('income_primary_job')
            .select('id')
            .eq('income_month_id', income_month_id)
            .maybeSingle();

        const hasPrimary = Object.values(primaryPayload).some((v) => v);

        if (existingPrimary) {
            if (hasPrimary) {
                const { error: primaryError } = await supabase
                    .from('income_primary_job')
                    .update(primaryPayload)
                    .eq('id', existingPrimary.id);
                if (primaryError) return fail(400, { message: primaryError.message });
            } else {
                await supabase.from('income_primary_job').delete().eq('id', existingPrimary.id);
            }
        } else if (hasPrimary) {
            const { error: primaryError } = await supabase.from('income_primary_job').insert({
                income_month_id,
                user_id: user.id,
                ...primaryPayload
            });
            if (primaryError) return fail(400, { message: primaryError.message });
        }

        // ⭐ Extra jobb — ta bort alla och skapa nya
        await supabase.from('income_extra_jobs').delete().eq('income_month_id', income_month_id);

        const arbetsgivareArr = form.getAll('extra_arbetsgivare') as string[];
        const lonArr = form.getAll('extra_lon_fore_skatt') as string[];
        const franvaroArr = form.getAll('extra_franvaro') as string[];
        const inbetaldArr = form.getAll('extra_inbetald_skatt') as string[];
        const frivilligArr = form.getAll('extra_frivillig_skatt') as string[];
        const attBetalaArr = form.getAll('extra_att_betala_ut') as string[];

        const extraRows = arbetsgivareArr
            .map((arbetsgivare, i) => ({
                income_month_id,
                user_id: user.id,
                arbetsgivare: arbetsgivare || null,
                lon_fore_skatt: lonArr[i] || null,
                franvaro: franvaroArr[i] || null,
                inbetald_skatt: inbetaldArr[i] || null,
                frivillig_skatt: frivilligArr[i] || null,
                att_betala_ut: attBetalaArr[i] || null
            }))
            .filter((row) => Object.values(row).some((v) => v && v !== income_month_id && v !== user.id));

        if (extraRows.length > 0) {
            const { error: extraError } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (extraError) return fail(400, { message: extraError.message });
        }

        // ⭐ Försäkringskassan
        const fkPayload = {
            ersattning_fore_skatt: form.get('fk_ersattning_fore_skatt') || null,
            inbetald_skatt: form.get('fk_inbetald_skatt') || null,
            att_betala_ut: form.get('fk_att_betala_ut') || null
        };

        const { data: existingFk } = await supabase
            .from('income_fk')
            .select('id')
            .eq('income_month_id', income_month_id)
            .maybeSingle();

        const hasFk = Object.values(fkPayload).some((v) => v);

        if (existingFk) {
            if (hasFk) {
                const { error: fkError } = await supabase
                    .from('income_fk')
                    .update(fkPayload)
                    .eq('id', existingFk.id);
                if (fkError) return fail(400, { message: fkError.message });
            } else {
                await supabase.from('income_fk').delete().eq('id', existingFk.id);
            }
        } else if (hasFk) {
            const { error: fkError } = await supabase.from('income_fk').insert({
                income_month_id,
                user_id: user.id,
                ...fkPayload
            });
            if (fkError) return fail(400, { message: fkError.message });
        }

        throw redirect(303, '/incomes');
    }
};
