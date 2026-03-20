import { redirect, fail } from '@sveltejs/kit';
import { getAccessContext } from '$lib/server/access';

function parseMonth(value: any): string | null {
    if (!value) return null;
    const s = value.toString();
    if (!/^\d{4}-\d{2}$/.test(s)) return null;
    return `${s}-01`;
}

async function syncMonthlyIncome(supabase, householdId, userId, incomeMonthId) {
    const { data: primary } = await supabase
        .from('income_primary_job')
        .select('att_betala_ut')
        .eq('income_month_id', incomeMonthId)
        .maybeSingle();

    const { data: extra } = await supabase
        .from('income_extra_jobs')
        .select('att_betala_ut')
        .eq('income_month_id', incomeMonthId);

    const { data: fk } = await supabase
        .from('income_fk')
        .select('att_betala_ut')
        .eq('income_month_id', incomeMonthId);

    const p = primary?.att_betala_ut ? Number(primary.att_betala_ut) : 0;
    const e = (extra ?? []).reduce((s, r) => s + (r.att_betala_ut ? Number(r.att_betala_ut) : 0), 0);
    const f = (fk ?? []).reduce((s, r) => s + (r.att_betala_ut ? Number(r.att_betala_ut) : 0), 0);

    const total = p + e + f;

    await supabase
        .from('income_months')
        .update({ total })
        .eq('id', incomeMonthId)
        .eq('household_id', householdId)
        .eq('user_id', userId);
}

export const load = async ({ locals, url }) => {
    const access = await getAccessContext(locals, url);
    if (!access.allowed) throw redirect(303, '/login');

    const supabase = locals.supabase;
    const householdId = locals.householdId;
    const selectedUserId = access.selectedUserId;

    const { data: months } = await supabase
        .from('income_months')
        .select('*')
        .eq('household_id', householdId)
        .eq('user_id', selectedUserId)
        .order('month_date', { ascending: false });

    const { data: employers } = await supabase
        .from('income_employers')
        .select('*')
        .eq('household_id', householdId)
        .order('name', { ascending: true });

    if (!months || months.length === 0) {
        return {
            access,
            months: [],
            employers: employers ?? []
        };
    }

    const { data: primary } = await supabase
        .from('income_primary_job')
        .select('*')
        .eq('household_id', householdId)
        .eq('user_id', selectedUserId);

    const { data: extra } = await supabase
        .from('income_extra_jobs')
        .select('*')
        .eq('household_id', householdId)
        .eq('user_id', selectedUserId);

    const { data: fk } = await supabase
        .from('income_fk')
        .select('*')
        .eq('household_id', householdId)
        .eq('user_id', selectedUserId);

    const employersMap = new Map();
    (employers ?? []).forEach((e) => {
        if (e.id) employersMap.set(e.id, e.name);
    });

    const enriched = months.map((m) => {
        const p = primary?.find((x) => x.income_month_id === m.id) ?? null;
        const e = (extra ?? []).filter((x) => x.income_month_id === m.id);
        const f = (fk ?? []).filter((x) => x.income_month_id === m.id);

        const extraWithNames = e.map((row) => ({
            ...row,
            employer_name: row.employer_id ? employersMap.get(row.employer_id) ?? null : null
        }));

        const pNet = p?.att_betala_ut ? Number(p.att_betala_ut) : 0;
        const eNet = extraWithNames.reduce(
            (s, r) => s + (r.att_betala_ut ? Number(r.att_betala_ut) : 0),
            0
        );
        const fNet = f.reduce((s, r) => s + (r.att_betala_ut ? Number(r.att_betala_ut) : 0), 0);

        return {
            ...m,
            month: m.month_date.slice(0, 7),
            primary_job: p,
            extra_jobs: extraWithNames,
            fk_list: f,
            primary_netto: pNet,
            extra_netto: eNet,
            fk_netto: fNet,
            total: pNet + eNet + fNet
        };
    });

    return {
        access,
        months: enriched,
        employers: employers ?? []
    };
};

export const actions = {
    create_employer: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const name = form.get('name')?.toString().trim();
        if (!name) return fail(400, { message: 'Namn saknas' });

        const { data, error } = await supabase
            .from('income_employers')
            .insert({
                household_id: householdId,
                user_id: access.currentUserId,
                name
            })
            .select('*')
            .single();

        if (error) return fail(400, { message: error.message });

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    create_income: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;
        const targetUserId = access.selectedUserId;

        const form = await request.formData();
        const month = parseMonth(form.get('month'));
        if (!month) return fail(400, { message: 'Ogiltig månad' });

        const { data: monthRow, error: monthErr } = await supabase
            .from('income_months')
            .insert({
                household_id: householdId,
                user_id: targetUserId,
                month_date: month
            })
            .select('id')
            .single();

        if (monthErr || !monthRow) return fail(400, { message: monthErr?.message });

        const income_month_id = monthRow.id;

        const primaryPayload = {
            income_month_id,
            household_id: householdId,
            user_id: targetUserId,
            lon_fore_skatt: form.get('primary_lon_fore_skatt') || null,
            franvaro: form.get('primary_franvaro') || null,
            inbetald_skatt: form.get('primary_inbetald_skatt') || null,
            frivillig_skatt: form.get('primary_frivillig_skatt') || null,
            att_betala_ut: form.get('primary_att_betala_ut') || null
        };

        const hasPrimary = Object.values(primaryPayload).some(
            (v) => v && v !== income_month_id && v !== householdId && v !== targetUserId
        );

        if (hasPrimary) {
            const { error } = await supabase.from('income_primary_job').insert(primaryPayload);
            if (error) return fail(400, { message: error.message });
        }

        const employerIdArr = form.getAll('extra_employer_id');
        const lonArr = form.getAll('extra_lon_fore_skatt');
        const franvaroArr = form.getAll('extra_franvaro');
        const inbetaldArr = form.getAll('extra_inbetald_skatt');
        const frivilligArr = form.getAll('extra_frivillig_skatt');
        const attBetalaArr = form.getAll('extra_att_betala_ut');

        const extraRows = employerIdArr
            .map((employerId, i) => ({
                income_month_id,
                household_id: householdId,
                user_id: targetUserId,
                employer_id: employerId?.toString().trim() || null,
                lon_fore_skatt: lonArr[i] || null,
                franvaro: franvaroArr[i] || null,
                inbetald_skatt: inbetaldArr[i] || null,
                frivillig_skatt: frivilligArr[i] || null,
                att_betala_ut: attBetalaArr[i] || null
            }))
            .filter((row) => row.employer_id)
            .filter((row) =>
                Object.values(row).some(
                    (v) => v && v !== income_month_id && v !== householdId && v !== targetUserId
                )
            );

        if (extraRows.length > 0) {
            const { error } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (error) return fail(400, { message: error.message });
        }

        const fkTypArr = form.getAll('fk_typ');
        const fkOvrigtArr = form.getAll('fk_typ_ovrigt');
        const fkErsArr = form.getAll('fk_ersattning_fore_skatt');
        const fkInbetaldArr = form.getAll('fk_inbetald_skatt');
        const fkAttBetalaArr = form.getAll('fk_att_betala_ut');

        const fkRows = fkTypArr
            .map((typ, i) => ({
                income_month_id,
                household_id: householdId,
                user_id: targetUserId,
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

        await syncMonthlyIncome(supabase, householdId, targetUserId, income_month_id);

        throw redirect(303, `/incomes?user_id=${encodeURIComponent(targetUserId)}`);
    },

    update_income: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;
        const targetUserId = access.selectedUserId;

        const form = await request.formData();
        const income_month_id = form.get('income_month_id')?.toString();
        if (!income_month_id) return fail(400, { message: 'Saknar income_month_id' });

        const month = parseMonth(form.get('month'));
        if (month) {
            const { error } = await supabase
                .from('income_months')
                .update({ month_date: month })
                .eq('id', income_month_id)
                .eq('household_id', householdId)
                .eq('user_id', targetUserId);

            if (error) return fail(400, { message: error.message });
        }

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
            .eq('household_id', householdId)
            .eq('user_id', targetUserId)
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
                user_id: targetUserId,
                ...primaryPayload
            });

            if (error) return fail(400, { message: error.message });
        }

        await supabase
            .from('income_extra_jobs')
            .delete()
            .eq('income_month_id', income_month_id)
            .eq('household_id', householdId)
            .eq('user_id', targetUserId);

        const employerIdArr = form.getAll('extra_employer_id');
        const lonArr = form.getAll('extra_lon_fore_skatt');
        const franvaroArr = form.getAll('extra_franvaro');
        const inbetaldArr = form.getAll('extra_inbetald_skatt');
        const frivilligArr = form.getAll('extra_frivillig_skatt');
        const attBetalaArr = form.getAll('extra_att_betala_ut');

        const extraRows = employerIdArr
            .map((employerId, i) => ({
                income_month_id,
                household_id: householdId,
                user_id: targetUserId,
                employer_id: employerId?.toString().trim() || null,
                lon_fore_skatt: lonArr[i] || null,
                franvaro: franvaroArr[i] || null,
                inbetald_skatt: inbetaldArr[i] || null,
                frivillig_skatt: frivilligArr[i] || null,
                att_betala_ut: attBetalaArr[i] || null
            }))
            .filter((row) => row.employer_id)
            .filter((row) => Object.values(row).some((v) => v));

        if (extraRows.length > 0) {
            const { error } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (error) return fail(400, { message: error.message });
        }

        await supabase
            .from('income_fk')
            .delete()
            .eq('income_month_id', income_month_id)
            .eq('household_id', householdId)
            .eq('user_id', targetUserId);

        const fkTypArr = form.getAll('fk_typ');
        const fkOvrigtArr = form.getAll('fk_typ_ovrigt');
        const fkErsArr = form.getAll('fk_ersattning_fore_skatt');
        const fkInbetaldArr = form.getAll('fk_inbetald_skatt');
        const fkAttBetalaArr = form.getAll('fk_att_betala_ut');

        const fkRows = fkTypArr
            .map((typ, i) => ({
                income_month_id,
                household_id: householdId,
                user_id: targetUserId,
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

        await syncMonthlyIncome(supabase, householdId, targetUserId, income_month_id);

        throw redirect(303, `/incomes?user_id=${encodeURIComponent(targetUserId)}`);
    }
};
