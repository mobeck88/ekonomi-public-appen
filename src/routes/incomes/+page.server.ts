import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { months: [] };

    const { data: months } = await supabase
        .from('income_months')
        .select('*')
        .eq('household_id', householdId)
        .order('month_date', { ascending: false });

    if (!months) return { months: [] };

    const { data: primary } = await supabase.from('income_primary_job').select('*');
    const { data: extra } = await supabase.from('income_extra_jobs').select('*');
    const { data: fk } = await supabase.from('income_fk').select('*');

    const enriched = months.map((m) => {
        const p = primary?.find((p) => p.income_month_id === m.id) ?? null;
        const e = extra?.filter((e) => e.income_month_id === m.id) ?? [];
        const f = fk?.filter((f) => f.income_month_id === m.id) ?? [];

        const primary_netto = p?.att_betala_ut ? Number(p.att_betala_ut) : 0;
        const extra_netto = e.reduce(
            (sum, row) => sum + (row.att_betala_ut ? Number(row.att_betala_ut) : 0),
            0
        );
        const fk_netto = f.reduce(
            (sum, row) => sum + (row.att_betala_ut ? Number(row.att_betala_ut) : 0),
            0
        );

        return {
            ...m,
            month: m.month_date.slice(0, 7),
            primary_job: p,
            extra_jobs: e,
            fk_list: f,
            primary_netto,
            extra_netto,
            fk_netto,
            total: primary_netto + extra_netto + fk_netto
        };
    });

    return { months: enriched };
};

// ⭐ Konverterar UI-input till en giltig DATE (YYYY-MM-DD)
function parseMonth(raw: FormDataEntryValue | null): string | null {
    if (!raw) return null;

    const s = raw.toString().trim();

    if (/^\d{4}-\d{2}$/.test(s)) {
        const d = new Date(`${s}-01`);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10);
    }

    return null;
}

export const actions: Actions = {
    create_income: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Saknar hushåll' });

        const form = await request.formData();

        const month = parseMonth(form.get('month'));
        if (!month) return fail(400, { message: 'Ogiltigt månadsvärde' });

        const { data: monthRow, error: monthError } = await supabase
            .from('income_months')
            .insert({
                household_id: householdId,
                user_id: user.id,
                month_date: month
            })
            .select('id')
            .single();

        if (monthError || !monthRow) return fail(400, { message: monthError?.message });

        const income_month_id = monthRow.id;

        // ⭐ Ordinarie arbete
        const primaryPayload = {
            income_month_id,
            household_id: householdId,
            user_id: user.id,
            lon_fore_skatt: form.get('primary_lon_fore_skatt') || null,
            franvaro: form.get('primary_franvaro') || null,
            inbetald_skatt: form.get('primary_inbetald_skatt') || null,
            frivillig_skatt: form.get('primary_frivillig_skatt') || null,
            att_betala_ut: form.get('primary_att_betala_ut') || null
        };

        const hasPrimary = Object.values(primaryPayload).some(
            (v) => v && v !== income_month_id && v !== householdId && v !== user.id
        );

        if (hasPrimary) {
            const { error } = await supabase.from('income_primary_job').insert(primaryPayload);
            if (error) return fail(400, { message: error.message });
        }

        // ⭐ Extra jobb
        const arbetsgivareArr = form.getAll('extra_arbetsgivare');
        const lonArr = form.getAll('extra_lon_fore_skatt');
        const franvaroArr = form.getAll('extra_franvaro');
        const inbetaldArr = form.getAll('extra_inbetald_skatt');
        const frivilligArr = form.getAll('extra_frivillig_skatt');
        const attBetalaArr = form.getAll('extra_att_betala_ut');

        const extraRows = arbetsgivareArr
            .map((arbetsgivare, i) => ({
                income_month_id,
                household_id: householdId,
                user_id: user.id,
                arbetsgivare_namn: arbetsgivare || null,
                lon_fore_skatt: lonArr[i] || null,
                franvaro: franvaroArr[i] || null,
                inbetald_skatt: inbetaldArr[i] || null,
                frivillig_skatt: frivilligArr[i] || null,
                att_betala_ut: attBetalaArr[i] || null
            }))
            .filter((row) =>
                Object.values(row).some(
                    (v) => v && v !== income_month_id && v !== householdId && v !== user.id
                )
            );

        if (extraRows.length > 0) {
            const { error } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (error) return fail(400, { message: error.message });
        }

        // ⭐ Försäkringskassan — flera rader
        const fkTypArr = form.getAll('fk_typ');
        const fkOvrigtArr = form.getAll('fk_typ_ovrigt');
        const fkErsArr = form.getAll('fk_ersattning_fore_skatt');
        const fkInbetaldArr = form.getAll('fk_inbetald_skatt');
        const fkAttBetalaArr = form.getAll('fk_att_betala_ut');

        const fkRows = fkTypArr
            .map((typ, i) => ({
                income_month_id,
                household_id: householdId,
                user_id: user.id,
                fk_typ: typ || null,
                fk_typ_ovrigt: fkOvrigtArr[i] || null,
                ersattning_fore_skatt: fkErsArr[i] || null,
                inbetald_skatt: fkInbetaldArr[i] || null,
                att_betala_ut: fkAttBetalaArr[i] || null
            }))
            .filter((row) =>
                Object.values(row).some(
                    (v) =>
                        v &&
                        v !== income_month_id &&
                        v !== householdId &&
                        v !== user.id
                )
            );

        if (fkRows.length > 0) {
            const { error } = await supabase.from('income_fk').insert(fkRows);
            if (error) return fail(400, { message: error.message });
        }

        throw redirect(303, '/incomes');
    },

    update_income: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Saknar hushåll' });

        const form = await request.formData();

        const income_month_id = form.get('income_month_id');
        if (!income_month_id) return fail(400, { message: 'Saknar income_month_id' });

        const month = parseMonth(form.get('month'));

        if (month) {
            const { error } = await supabase
                .from('income_months')
                .update({ month_date: month })
                .eq('id', income_month_id)
                .eq('household_id', householdId);

            if (error) return fail(400, { message: error.message });
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
                const { error } = await supabase
                    .from('income_primary_job')
                    .update(primaryPayload)
                    .eq('id', existingPrimary.id);

                if (error) return fail(400, { message: error.message });
            } else {
                await supabase.from('income_primary_job').delete().eq('id', existingPrimary.id);
            }
        } else if (hasPrimary) {
            const { error } = await supabase.from('income_primary_job').insert({
                income_month_id,
                household_id: householdId,
                user_id: user.id,
                ...primaryPayload
            });

            if (error) return fail(400, { message: error.message });
        }

        // ⭐ Extra jobb
        await supabase.from('income_extra_jobs').delete().eq('income_month_id', income_month_id);

        const arbetsgivareArr = form.getAll('extra_arbetsgivare');
        const lonArr = form.getAll('extra_lon_fore_skatt');
        const franvaroArr = form.getAll('extra_franvaro');
        const inbetaldArr = form.getAll('extra_inbetald_skatt');
        const frivilligArr = form.getAll('extra_frivillig_skatt');
        const attBetalaArr = form.getAll('extra_att_betala_ut');

        const extraRows = arbetsgivareArr
            .map((arbetsgivare, i) => ({
                income_month_id,
                household_id: householdId,
                user_id: user.id,
                arbetsgivare_namn: arbetsgivare || null,
                lon_fore_skatt: lonArr[i] || null,
                franvaro: franvaroArr[i] || null,
                inbetald_skatt: inbetaldArr[i] || null,
                frivillig_skatt: frivilligArr[i] || null,
                att_betala_ut: attBetalaArr[i] || null
            }))
            .filter((row) => Object.values(row).some((v) => v));

        if (extraRows.length > 0) {
            const { error } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (error) return fail(400, { message: error.message });
        }

        // ⭐ Försäkringskassan — flera rader
        await supabase.from('income_fk').delete().eq('income_month_id', income_month_id);

        const fkTypArr = form.getAll('fk_typ');
        const fkOvrigtArr = form.getAll('fk_typ_ovrigt');
        const fkErsArr = form.getAll('fk_ersattning_fore_skatt');
        const fkInbetaldArr = form.getAll('fk_inbetald_skatt');
        const fkAttBetalaArr = form.getAll('fk_att_betala_ut');

        const fkRows = fkTypArr
            .map((typ, i) => ({
                income_month_id,
                household_id: householdId,
                user_id: user.id,
                fk_typ: typ || null,
                fk_typ_ovrigt: fkOvrigtArr[i] || null,
                ersattning_fore_skatt: fkErsArr[i] || null,
                inbetald_skatt: fkInbetaldArr[i] || null,
                att_betala_ut: fkAttBetalaArr[i] || null
            }))
            .filter((row) => Object.values(row).some((v) => v));

        if (fkRows.length > 0) {
            const { error } = await supabase.from('income_fk').insert(fkRows);
            if (error) return fail(400, { message: error.message });
        }

        throw redirect(303, '/incomes');
    }
};
