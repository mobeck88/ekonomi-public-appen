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

    const enriched = months.map((m) => ({
        ...m,
        primary_job: primary?.find((p) => p.income_month_id === m.id) ?? null,
        extra_jobs: extra?.filter((e) => e.income_month_id === m.id) ?? [],
        fk: fk?.find((f) => f.income_month_id === m.id) ?? null
    }));

    return { months: enriched };
};

// ⭐ Konverterar UI-input till en giltig DATE (YYYY-MM-DD)
function parseMonth(raw: FormDataEntryValue | null): string | null {
    if (!raw) return null;

    const s = raw.toString().trim();

    // UI skickar "YYYY-MM"
    if (/^\d{4}-\d{2}$/.test(s)) {
        const d = new Date(`${s}-01`);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }

    // UI kan i vissa fall skicka "YYYY-MM-DD"
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

        // ⭐ Hård validering — nu 100% kompatibel med DATE
        const month = parseMonth(form.get('month'));
        if (!month) return fail(400, { message: 'Ogiltigt månadsvärde' });

        const { data: monthRow, error: monthError } = await supabase
            .from('income_months')
            .insert({
                household_id: householdId,
                user_id: user.id,
                month_date: month // <-- rätt kolumn
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

        const hasPrimary = Object.values(primaryPayload).some(
            (v) => v && v !== income_month_id && v !== user.id
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
                user_id: user.id,
                arbetsgivare: arbetsgivare || null,
                lon_fore_skatt: lonArr[i] || null,
                franvaro: franvaroArr[i] || null,
                inbetald_skatt: inbetaldArr[i] || null,
                frivillig_skatt: frivilligArr[i] || null,
                att_betala_ut: attBetalaArr[i] || null
            }))
            .filter((row) =>
                Object.values(row).some((v) => v && v !== income_month_id && v !== user.id)
            );

        if (extraRows.length > 0) {
            const { error } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (error) return fail(400, { message: error.message });
        }

        // ⭐ Försäkringskassan
        const fkPayload = {
            income_month_id,
            user_id: user.id,
            ersattning_fore_skatt: form.get('fk_ersattning_fore_skatt') || null,
            inbetald_skatt: form.get('fk_inbetald_skatt') || null,
            att_betala_ut: form.get('fk_att_betala_ut') || null
        };

        const hasFk = Object.values(fkPayload).some(
            (v) => v && v !== income_month_id && v !== user.id
        );

        if (hasFk) {
            const { error } = await supabase.from('income_fk').insert(fkPayload);
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
                .update({ month_date: month }) // <-- rätt kolumn
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
                user_id: user.id,
                arbetsgivare: arbetsgivare || null,
                lon_fore_skatt: lonArr[i] || null,
                franvaro: franvaroArr[i] || null,
                inbetald_skatt: inbetaldArr[i] || null,
                frivillig_skatt: frivilligArr[i] || null,
                att_betala_ut: attBetalaArr[i] || null
            }))
            .filter((row) =>
                Object.values(row).some((v) => v && v !== income_month_id && v !== user.id)
            );

        if (extraRows.length > 0) {
            const { error } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (error) return fail(400, { message: error.message });
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
                const { error } = await supabase
                    .from('income_fk')
                    .update(fkPayload)
                    .eq('id', existingFk.id);

                if (error) return fail(400, { message: error.message });
            } else {
                await supabase.from('income_fk').delete().eq('id', existingFk.id);
            }
        } else if (hasFk) {
            const { error } = await supabase.from('income_fk').insert({
                income_month_id,
                user_id: user.id,
                ...fkPayload
            });

            if (error) return fail(400, { message: error.message });
        }

        throw redirect(303, '/incomes');
    }
};
