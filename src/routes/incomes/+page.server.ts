import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/* -------------------------------------------------------
   HJÄLPFUNKTION: Synka monthly_income för en månad
------------------------------------------------------- */
async function syncMonthlyIncome(
    supabase: any,
    householdId: string,
    userId: string,
    income_month_id: string
) {
    // 1) Hämta month_date från income_months
    const { data: monthRow, error: monthError } = await supabase
        .from('income_months')
        .select('month_date')
        .eq('id', income_month_id)
        .eq('household_id', householdId)
        .single();

    if (monthError || !monthRow) {
        return;
    }

    const month_date = monthRow.month_date;

    // 2) Hämta alla inkomster för månaden
    const { data: primary } = await supabase
        .from('income_primary_job')
        .select('*')
        .eq('income_month_id', income_month_id)
        .eq('household_id', householdId)
        .eq('user_id', userId);

    const { data: extra } = await supabase
        .from('income_extra_jobs')
        .select('*')
        .eq('income_month_id', income_month_id)
        .eq('household_id', householdId)
        .eq('user_id', userId);

    const { data: fk } = await supabase
        .from('income_fk')
        .select('*')
        .eq('income_month_id', income_month_id)
        .eq('household_id', householdId)
        .eq('user_id', userId);

    // 3) Summera ordinarie (en rad)
    const p = primary && primary.length > 0 ? primary[0] : null;

    const ord_lon_fore_skatt = p?.lon_fore_skatt ? Number(p.lon_fore_skatt) : 0;
    const ord_franvaro = p?.franvaro ? Number(p.franvaro) : 0;
    const ord_skatt = p?.inbetald_skatt ? Number(p.inbetald_skatt) : 0;
    const ord_nettolon = p?.att_betala_ut ? Number(p.att_betala_ut) : 0;

    // 4) Summera extra jobb (flera rader)
    const ass_lon_fore_skatt =
        extra?.reduce((sum: number, row: any) => sum + Number(row.lon_fore_skatt || 0), 0) ?? 0;
    const ass_skatt =
        extra?.reduce((sum: number, row: any) => sum + Number(row.inbetald_skatt || 0), 0) ?? 0;
    const ass_frivillig_skatt =
        extra?.reduce((sum: number, row: any) => sum + Number(row.frivillig_skatt || 0), 0) ?? 0;
    const ass_nettolon =
        extra?.reduce((sum: number, row: any) => sum + Number(row.att_betala_ut || 0), 0) ?? 0;

    // 5) Summera FK (flera rader)
    const fk_lon_fore_skatt =
        fk?.reduce((sum: number, row: any) => sum + Number(row.ersattning_fore_skatt || 0), 0) ??
        0;
    const fk_skatt =
        fk?.reduce((sum: number, row: any) => sum + Number(row.inbetald_skatt || 0), 0) ?? 0;
    const fk_nettolon =
        fk?.reduce((sum: number, row: any) => sum + Number(row.att_betala_ut || 0), 0) ?? 0;

    // 6) Upsert i monthly_income (OBS: kolumnen heter "month")
    const payload = {
        user_id: userId,
        month: month_date,
        ord_lon_fore_skatt,
        ord_franvaro,
        ord_skatt,
        ord_nettolon,
        ass_lon_fore_skatt,
        ass_skatt,
        ass_frivillig_skatt,
        ass_nettolon,
        fk_lon_fore_skatt,
        fk_skatt,
        fk_nettolon,
        inserted_at: new Date().toISOString()
    };

    const { data: existing } = await supabase
        .from('monthly_income')
        .select('user_id, month')
        .eq('user_id', userId)
        .eq('month', month_date)
        .maybeSingle();

    if (existing) {
        await supabase
            .from('monthly_income')
            .update(payload)
            .eq('user_id', userId)
            .eq('month', month_date);
    } else {
        await supabase.from('monthly_income').insert(payload);
    }
}

/* -------------------------------------------------------
   HJÄLPFUNKTION: Hämta medlemskap + roll + guardian-target
------------------------------------------------------- */
async function getMembershipContext(
    supabase: any,
    householdId: string,
    userId: string
): Promise<{
    membership: any | null;
    isOwner: boolean;
    isGuardian: boolean;
    targetUserIdForGuardian: string | null;
}> {
    const { data: membership } = await supabase
        .from('household_members')
        .select('id, role, guardian_for, user_id')
        .eq('household_id', householdId)
        .eq('user_id', userId)
        .maybeSingle();

    const role = membership?.role ?? null;
    const isOwner = role === 'owner';
    const isGuardian = role === 'guardian';

    let targetUserIdForGuardian: string | null = null;

    if (isGuardian && membership?.guardian_for) {
        const { data: guardianTarget } = await supabase
            .from('household_members')
            .select('id, user_id')
            .eq('id', membership.guardian_for)
            .eq('household_id', householdId)
            .maybeSingle();

        if (guardianTarget?.user_id) {
            targetUserIdForGuardian = guardianTarget.user_id;
        }
    }

    return { membership, isOwner, isGuardian, targetUserIdForGuardian };
}

/* -------------------------------------------------------
   PARSE MONTH
------------------------------------------------------- */
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

/* -------------------------------------------------------
   LOAD
------------------------------------------------------- */
export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, '/login');
    if (!householdId) {
        return {
            months: [],
            employers: [],
            members: [],
            selectedUserId: user.id,
            currentUserId: user.id,
            isOwner: false,
            isGuardian: false,
            guardianForMemberId: null
        };
    }

    // Medlemskap + roll + ev guardian-target
    const { membership, isOwner, isGuardian, targetUserIdForGuardian } =
        await getMembershipContext(supabase, householdId, user.id);

    // Alla medlemmar i hushållet (för dropdown)
    const { data: members } = await supabase
        .from('household_members')
        .select('id, user_id, role, guardian_for')
        .eq('household_id', householdId);

    // Vald user_id via query-param (endast relevant för owner)
    const userIdParam = url.searchParams.get('user_id');

    let selectedUserId: string = user.id;

    if (isOwner) {
        if (userIdParam) {
            const match = members?.find((m: any) => m.user_id === userIdParam);
            selectedUserId = match ? userIdParam : user.id;
        } else {
            selectedUserId = user.id;
        }
    } else if (isGuardian && targetUserIdForGuardian) {
        selectedUserId = targetUserIdForGuardian;
    } else {
        selectedUserId = user.id;
    }

    // Hämta månader + inkomster för just selectedUserId
    const { data: months } = await supabase
        .from('income_months')
        .select('*')
        .eq('household_id', householdId)
        .eq('user_id', selectedUserId)
        .order('month_date', { ascending: false });

    if (!months || months.length === 0) {
        const { data: employers } = await supabase
            .from('income_employers')
            .select('*')
            .eq('household_id', householdId)
            .order('name', { ascending: true });

        return {
            months: [],
            employers: employers ?? [],
            members: members ?? [],
            selectedUserId,
            currentUserId: user.id,
            isOwner,
            isGuardian,
            guardianForMemberId: membership?.guardian_for ?? null
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

    const { data: employers } = await supabase
        .from('income_employers')
        .select('*')
        .eq('household_id', householdId)
        .order('name', { ascending: true });

    const employersMap = new Map<string, { id: string; name: string }>();
    (employers ?? []).forEach((e: any) => {
        if (e.id) {
            employersMap.set(e.id, { id: e.id, name: e.name });
        }
    });

    const enriched = months.map((m) => {
        const p = primary?.find((p) => p.income_month_id === m.id) ?? null;
        const e = (extra ?? []).filter((e) => e.income_month_id === m.id);
        const f = (fk ?? []).filter((f) => f.income_month_id === m.id);

        const extraWithEmployer = e.map((row) => {
            const employer = row.employer_id ? employersMap.get(row.employer_id) : undefined;
            return {
                ...row,
                employer_name: employer?.name ?? null
            };
        });

        const primary_netto = p?.att_betala_ut ? Number(p.att_betala_ut) : 0;
        const extra_netto = extraWithEmployer.reduce(
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
            extra_jobs: extraWithEmployer,
            fk_list: f,
            primary_netto,
            extra_netto,
            fk_netto,
            total: primary_netto + extra_netto + fk_netto
        };
    });

    return {
        months: enriched,
        employers: employers ?? [],
        members: members ?? [],
        selectedUserId,
        currentUserId: user.id,
        isOwner,
        isGuardian,
        guardianForMemberId: membership?.guardian_for ?? null
    };
};

/* -------------------------------------------------------
   ACTIONS
------------------------------------------------------- */
export const actions: Actions = {
    create_employer: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Saknar hushåll' });

        const form = await request.formData();
        const name = form.get('name')?.toString().trim();

        if (!name) return fail(400, { message: 'Namn saknas' });

        const { data, error } = await supabase
            .from('income_employers')
            .insert({
                household_id: householdId,
                user_id: user.id,
                name
            })
            .select('*')
            .single();

        if (error) return fail(400, { message: error.message });

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    create_income: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Saknar hushåll' });

        const form = await request.formData();

        const { membership, isOwner, isGuardian, targetUserIdForGuardian } =
            await getMembershipContext(supabase, householdId, user.id);

        const selectedUserIdRaw = form.get('selected_user_id');
        const selectedUserIdFromForm = selectedUserIdRaw ? selectedUserIdRaw.toString() : null;

        let targetUserId: string = user.id;

        if (isOwner) {
            if (selectedUserIdFromForm) {
                const { data: memberMatch } = await supabase
                    .from('household_members')
                    .select('id')
                    .eq('household_id', householdId)
                    .eq('user_id', selectedUserIdFromForm)
                    .maybeSingle();

                targetUserId = memberMatch ? selectedUserIdFromForm : user.id;
            } else {
                targetUserId = user.id;
            }
        } else if (isGuardian) {
            if (!targetUserIdForGuardian) {
                return fail(400, { message: 'Guardian saknar huvudman' });
            }
            targetUserId = targetUserIdForGuardian;
        } else {
            targetUserId = user.id;
        }

        const month = parseMonth(form.get('month'));
        if (!month) return fail(400, { message: 'Ogiltigt månadsvärde' });

        const { data: monthRow, error: monthError } = await supabase
            .from('income_months')
            .insert({
                household_id: householdId,
                user_id: targetUserId,
                month_date: month
            })
            .select('id')
            .single();

        if (monthError || !monthRow) return fail(400, { message: monthError?.message });

        const income_month_id: string = monthRow.id;

        // Ordinarie arbete
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

        // Extra jobb
        const employerIdArr = form.getAll('extra_employer_id');
        const lonArr = form.getAll('extra_lon_fore_skatt');
        const franvaroArr = form.getAll('extra_franvaro');
        const inbetaldArr = form.getAll('extra_inbetald_skatt');
        const frivilligArr = form.getAll('extra_frivillig_skatt');
        const attBetalaArr = form.getAll('extra_att_betala_ut');

        const extraRows = employerIdArr
            .map((employerId, i) => {
                const employer_id = employerId?.toString().trim() || null;

                const row = {
                    income_month_id,
                    household_id: householdId,
                    user_id: targetUserId,
                    employer_id,
                    lon_fore_skatt: lonArr[i] || null,
                    franvaro: franvaroArr[i] || null,
                    inbetald_skatt: inbetaldArr[i] || null,
                    frivillig_skatt: frivilligArr[i] || null,
                    att_betala_ut: attBetalaArr[i] || null
                };

                return row;
            })
            .filter((row) =>
                Object.values(row).some(
                    (v) => v && v !== income_month_id && v !== householdId && v !== targetUserId
                )
            )
            .filter((row) => row.employer_id);

        if (extraRows.length > 0) {
            const { error } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (error) return fail(400, { message: error.message });
        }

        // Försäkringskassan
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
            .filter((row) =>
                Object.values(row).some(
                    (v) => v && v !== income_month_id && v !== householdId && v !== targetUserId
                )
            );

        if (fkRows.length > 0) {
            const { error } = await supabase.from('income_fk').insert(fkRows);
            if (error) return fail(400, { message: error.message });
        }

        // Synka monthly_income
        await syncMonthlyIncome(supabase, householdId, targetUserId, income_month_id);

        throw redirect(303, `/incomes?user_id=${encodeURIComponent(targetUserId)}`);
    },

    update_income: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Saknar hushåll' });

        const form = await request.formData();

        const income_month_id_raw = form.get('income_month_id');
        if (!income_month_id_raw) return fail(400, { message: 'Saknar income_month_id' });
        const income_month_id = income_month_id_raw.toString();

        const { membership, isOwner, isGuardian, targetUserIdForGuardian } =
            await getMembershipContext(supabase, householdId, user.id);

        // Hämta månadens ägare
        const { data: monthOwner, error: monthOwnerError } = await supabase
            .from('income_months')
            .select('user_id, household_id')
            .eq('id', income_month_id)
            .single();

        if (monthOwnerError || !monthOwner) {
            return fail(400, { message: 'Kunde inte hitta inkomstmånad' });
        }

        if (monthOwner.household_id !== householdId) {
            return fail(403, { message: 'Fel hushåll' });
        }

        const monthUserId: string = monthOwner.user_id;

        // Behörighetskontroll
        if (isOwner) {
            // owner får alltid
        } else if (isGuardian) {
            if (!targetUserIdForGuardian || monthUserId !== targetUserIdForGuardian) {
                return fail(403, { message: 'Guardian saknar behörighet för denna månad' });
            }
        } else {
            if (monthUserId !== user.id) {
                return fail(403, { message: 'Ingen behörighet att ändra denna inkomst' });
            }
        }

        const targetUserId = monthUserId;

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

        // Extra jobb – rensa och skriv om
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
            .map((employerId, i) => {
                const employer_id = employerId?.toString().trim() || null;

                const row = {
                    income_month_id,
                    household_id: householdId,
                    user_id: targetUserId,
                    employer_id,
                    lon_fore_skatt: lonArr[i] || null,
                    franvaro: franvaroArr[i] || null,
                    inbetald_skatt: inbetaldArr[i] || null,
                    frivillig_skatt: frivilligArr[i] || null,
                    att_betala_ut: attBetalaArr[i] || null
                };

                return row;
            })
            .filter((row) => Object.values(row).some((v) => v))
            .filter((row) => row.employer_id);

        if (extraRows.length > 0) {
            const { error } = await supabase.from('income_extra_jobs').insert(extraRows);
            if (error) return fail(400, { message: error.message });
        }

        // Försäkringskassan – rensa och skriv om
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

        // Synka monthly_income
        await syncMonthlyIncome(supabase, householdId, targetUserId, income_month_id);

        throw redirect(303, `/incomes?user_id=${encodeURIComponent(targetUserId)}`);
    }
};
