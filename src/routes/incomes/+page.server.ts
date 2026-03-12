import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

function sb(cookies: any) {
    const access_token = cookies.get('sb-access-token');
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${access_token}` } }
    });
}

export const load: PageServerLoad = async ({ locals, cookies }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { months: [] };

    const supabase = sb(cookies);

    // Hämta månader för hushållet
    const { data: months, error: monthsError } = await supabase
        .from('income_months')
        .select('*')
        .eq('household_id', householdId)
        .order('month', { ascending: false });

    if (monthsError || !months) return { months: [] };

    // Hämta alla tre sektioner
    const { data: primary } = await supabase.from('income_primary_job').select('*');
    const { data: extra } = await supabase.from('income_extra_jobs').select('*');
    const { data: fk } = await supabase.from('income_fk').select('*');

    const enriched = months.map((m) => ({
        ...m,
        primary_job: primary?.find((p) => p.income_month_id === m.id) ?? null,
        extra_jobs: extra?.filter((e) => e.income_month_id === m.id) ?? [],
        fk: fk?.find((f) => f.income_month_id === m.id) ?? null
    }));

    return { months: enriched };
};

export const actions: Actions = {
    // Skapa ny inkomst (månad + alla tre sektioner)
    create_income: async ({ request, locals, cookies }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Saknar hushåll' });

        const supabase = sb(cookies);
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

        if (monthError || !monthRow) return fail(400, { message: monthError?.message ?? 'Kunde inte skapa månad' });

        const income_month_id = monthRow.id;

        // Ordinarie arbete
        const primaryPayload = {
            income_month_id,
            user_id: user.id,
            lon_fore_skatt: form.get('primary_lon_fore_skatt') || null,
            franvaro: form.get('primary_franvaro') || null,
            inbetald_skatt: form.get('primary_inbetald_skatt') || null,
            frivillig_skatt: form.get('primary_frivillig_skatt') || null,
            att_betala_ut: form.get('primary_att_betala_ut') || null
        };

        const hasPrimary =
            primaryPayload.lon_fore_skatt ||
            primaryPayload.franvaro ||
            primaryPayload.inbetald_skatt ||
            primaryPayload.frivillig_skatt ||
            primaryPayload.att_betala_ut;

        if (hasPrimary) {
            const { error: primaryError } = await supabase.from('income_primary_job').insert(primaryPayload);
            if (primaryError) return fail(400, { message: primaryError.message });
        }

        // Extra jobb (arrays)
        const arbetsgivareArr = form.getAll('extra_arbetsgivare') as string[];
        const lonArr = form.getAll('extra_lon_fore_skatt') as string[];
        const franvaroArr = form.getAll('extra_franvaro') as string[];
        const inbetaldArr = form.getAll('extra_inbetald_skatt') as string[];
        const frivilligArr = form.getAll('extra_frivillig_skatt') as string[];
        const attBetalaArr = form.getAll('extra_att_betala_ut') as string[];

        const extraRows = arbetsgivareArr
            .map((arbetsgivare, index) => ({
                income_month_id,
                user_id: user.id,
                arbetsgivare: arbetsgivare || null,
                lon_fore_skatt: lonArr[index] || null,
                franvaro: franvaroArr[index] || null,
                inbetald_skatt: inbetaldArr[index] || null,
                frivillig_skatt: frivilligArr[index] || null,
                att_betala_ut: attBetalaArr[index] || null
            }))
            .filter(
                (row) =>
                    row.arbetsgivare ||
                    row.lon_fore_skatt ||
                    row.franvaro ||
                    row.inbetald_skatt ||
                    row.frivillig_skatt ||
                    row.att_betala_ut
            );

        if (extraRows.length > 0) {
            const { error: extraError } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (extraError) return fail(400, { message: extraError.message });
        }

        // Försäkringskassan
        const fkPayload = {
            income_month_id,
            user_id: user.id,
            ersattning_fore_skatt: form.get('fk_ersattning_fore_skatt') || null,
            inbetald_skatt: form.get('fk_inbetald_skatt') || null,
            att_betala_ut: form.get('fk_att_betala_ut') || null
        };

        const hasFk =
            fkPayload.ersattning_fore_skatt || fkPayload.inbetald_skatt || fkPayload.att_betala_ut;

        if (hasFk) {
            const { error: fkError } = await supabase.from('income_fk').insert(fkPayload);
            if (fkError) return fail(400, { message: fkError.message });
        }

        throw redirect(303, '/incomes');
    },

    // Uppdatera befintlig inkomst (månad + alla tre sektioner)
    update_income: async ({ request, locals, cookies }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Saknar hushåll' });

        const supabase = sb(cookies);
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

        // Ordinarie arbete
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

        const hasPrimary =
            primaryPayload.lon_fore_skatt ||
            primaryPayload.franvaro ||
            primaryPayload.inbetald_skatt ||
            primaryPayload.frivillig_skatt ||
            primaryPayload.att_betala_ut;

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

        // Extra jobb – ta bort alla och skapa nya
        await supabase.from('income_extra_jobs').delete().eq('income_month_id', income_month_id);

        const arbetsgivareArr = form.getAll('extra_arbetsgivare') as string[];
        const lonArr = form.getAll('extra_lon_fore_skatt') as string[];
        const franvaroArr = form.getAll('extra_franvaro') as string[];
        const inbetaldArr = form.getAll('extra_inbetald_skatt') as string[];
        const frivilligArr = form.getAll('extra_frivillig_skatt') as string[];
        const attBetalaArr = form.getAll('extra_att_betala_ut') as string[];

        const extraRows = arbetsgivareArr
            .map((arbetsgivare, index) => ({
                income_month_id,
                user_id: user.id,
                arbetsgivare: arbetsgivare || null,
                lon_fore_skatt: lonArr[index] || null,
                franvaro: franvaroArr[index] || null,
                inbetald_skatt: inbetaldArr[index] || null,
                frivillig_skatt: frivilligArr[index] || null,
                att_betala_ut: attBetalaArr[index] || null
            }))
            .filter(
                (row) =>
                    row.arbetsgivare ||
                    row.lon_fore_skatt ||
                    row.franvaro ||
                    row.inbetald_skatt ||
                    row.frivillig_skatt ||
                    row.att_betala_ut
            );

        if (extraRows.length > 0) {
            const { error: extraError } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (extraError) return fail(400, { message: extraError.message });
        }

        // Försäkringskassan
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

        const hasFk =
            fkPayload.ersattning_fore_skatt || fkPayload.inbetald_skatt || fkPayload.att_betala_ut;

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
