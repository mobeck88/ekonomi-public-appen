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
        return { rows: [] };
    }

    // Hämta alla månader för användaren
    const { data: months, error: monthsError } = await supabase
        .from('income_months')
        .select('id, month_date')
        .eq('household_id', householdId)
        .eq('user_id', user.id)
        .order('month_date', { ascending: false });

    if (monthsError || !months) {
        console.error("INCOME LOAD ERROR:", monthsError);
        return { rows: [] };
    }

    const monthIds = months.map((m) => m.id);

    // Hämta primary
    const { data: primary } = await supabase
        .from('income_primary_job')
        .select('income_month_id, att_betala_ut')
        .in('income_month_id', monthIds)
        .eq('household_id', householdId)
        .eq('user_id', user.id);

    // Hämta extra jobb
    const { data: extra } = await supabase
        .from('income_extra_jobs')
        .select('income_month_id, att_betala_ut')
        .in('income_month_id', monthIds)
        .eq('household_id', householdId)
        .eq('user_id', user.id);

    // Hämta FK
    const { data: fk } = await supabase
        .from('income_fk')
        .select('income_month_id, fk_typ, att_betala_ut')
        .in('income_month_id', monthIds)
        .eq('household_id', householdId)
        .eq('user_id', user.id);

    // Aggregation
    const primaryByMonth = new Map<string, number>();
    (primary ?? []).forEach((p) => {
        primaryByMonth.set(
            p.income_month_id,
            p.att_betala_ut ? Number(p.att_betala_ut) : 0
        );
    });

    const extraByMonth = new Map<string, number>();
    (extra ?? []).forEach((e) => {
        const key = e.income_month_id;
        const val = e.att_betala_ut ? Number(e.att_betala_ut) : 0;
        extraByMonth.set(key, (extraByMonth.get(key) ?? 0) + val);
    });

    type FkAgg = {
        a_kassa: number;
        foraldrapenning: number;
        vab: number;
        sjukpenning: number;
        bostadsbidrag: number;
        underhallsstod: number;
        etableringsersattning: number;
        ovrigt: number;
        total_fk: number;
    };

    const fkByMonth = new Map<string, FkAgg>();

    (fk ?? []).forEach((row) => {
        const key = row.income_month_id;
        const typ = row.fk_typ;
        const val = row.att_betala_ut ? Number(row.att_betala_ut) : 0;

        if (!fkByMonth.has(key)) {
            fkByMonth.set(key, {
                a_kassa: 0,
                foraldrapenning: 0,
                vab: 0,
                sjukpenning: 0,
                bostadsbidrag: 0,
                underhallsstod: 0,
                etableringsersattning: 0,
                ovrigt: 0,
                total_fk: 0
            });
        }

        const agg = fkByMonth.get(key)!;

        switch (typ) {
            case 'A-kassa': agg.a_kassa += val; break;
            case 'Föräldrapenning': agg.foraldrapenning += val; break;
            case 'VAB': agg.vab += val; break;
            case 'Sjukpenning': agg.sjukpenning += val; break;
            case 'Bostadsbidrag': agg.bostadsbidrag += val; break;
            case 'Underhållsstöd': agg.underhallsstod += val; break;
            case 'Etableringsersättning': agg.etableringsersattning += val; break;
            case 'Övrigt': agg.ovrigt += val; break;
            default: agg.ovrigt += val; break;
        }

        agg.total_fk += val;
    });

    // Bygg rader
    const rows = months.map((m) => {
        const key = m.id;

        const primary_netto = primaryByMonth.get(key) ?? 0;
        const extra_netto = extraByMonth.get(key) ?? 0;
        const fkAgg = fkByMonth.get(key) ?? {
            a_kassa: 0,
            foraldrapenning: 0,
            vab: 0,
            sjukpenning: 0,
            bostadsbidrag: 0,
            underhallsstod: 0,
            etableringsersattning: 0,
            ovrigt: 0,
            total_fk: 0
        };

        const total_netto = primary_netto + extra_netto + fkAgg.total_fk;

        return {
            month_date: m.month_date,
            primary_netto,
            extra_netto,
            ...fkAgg,
            total_netto
        };
    });

    return { rows };
};

// Ingen actions behövs för översikten
export const actions: Actions = {};
