import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, '/login');

    const currentYear = new Date().getFullYear();

    if (!householdId) {
        return {
            year: currentYear,
            currentYear,
            people: []
        };
    }

    // År
    const yearParam = url.searchParams.get('year');
    const year = yearParam ? Number(yearParam) : currentYear;

    // 1. Hämta hushållets användare
    const { data: members } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', householdId);

    if (!members || members.length === 0) {
        return {
            year,
            currentYear,
            people: []
        };
    }

    const userIds = members.map((m) => m.user_id);

    // 2. Hämta namn från profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

    const nameMap = new Map<string, string>();
    profiles?.forEach((p) => nameMap.set(p.id, p.full_name ?? 'Okänd'));

    // 3. Hämta income_months för året
    const { data: months } = await supabase
        .from('income_months')
        .select('id, user_id, month_date')
        .in('user_id', userIds)
        .gte('month_date', `${year}-01-01`)
        .lte('month_date', `${year}-12-31`)
        .order('month_date', { ascending: true });

    if (!months || months.length === 0) {
        return {
            year,
            currentYear,
            people: []
        };
    }

    const monthIds = months.map((m) => m.id);

    // 4. Hämta primary, extra och FK för dessa månader
    const { data: primary } = await supabase
        .from('income_primary_job')
        .select('*')
        .in('income_month_id', monthIds);

    const { data: extra } = await supabase
        .from('income_extra_jobs')
        .select('*')
        .in('income_month_id', monthIds);

    const { data: fk } = await supabase
        .from('income_fk')
        .select('*')
        .in('income_month_id', monthIds);

    // Gruppéring per användare
    const usersMap = new Map<string, any[]>();

    for (const m of months) {
        const p = primary?.find((r) => r.income_month_id === m.id) ?? null;
        const e = (extra ?? []).filter((r) => r.income_month_id === m.id);
        const f = (fk ?? []).filter((r) => r.income_month_id === m.id);

        // Summera ordinarie
        const ord_lon_fore_skatt = p?.lon_fore_skatt ? Number(p.lon_fore_skatt) : 0;
        const ord_franvaro = p?.franvaro ? Number(p.franvaro) : 0;
        const ord_skatt = p?.inbetald_skatt ? Number(p.inbetald_skatt) : 0;
        const ord_nettolon = p?.att_betala_ut ? Number(p.att_betala_ut) : 0;

        // Summera extra jobb
        const ass_lon_fore_skatt = e.reduce((s, r) => s + Number(r.lon_fore_skatt || 0), 0);
        const ass_skatt = e.reduce((s, r) => s + Number(r.inbetald_skatt || 0), 0);
        const ass_frivillig_skatt = e.reduce((s, r) => s + Number(r.frivillig_skatt || 0), 0);
        const ass_nettolon = e.reduce((s, r) => s + Number(r.att_betala_ut || 0), 0);

        // Summera FK
        const fk_lon_fore_skatt = f.reduce((s, r) => s + Number(r.ersattning_fore_skatt || 0), 0);

        // FK-regel: endast rader med skatt > 0 ska räknas i skatteberäkningen
        const fk_skatt = f.reduce(
            (s, r) => s + (Number(r.inbetald_skatt) > 0 ? Number(r.inbetald_skatt) : 0),
            0
        );

        // Netto ska alltid inkludera alla FK-rader
        const fk_nettolon = f.reduce((s, r) => s + Number(r.att_betala_ut || 0), 0);

        const row = {
            user_id: m.user_id,
            month: m.month_date,
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
            fk_nettolon
        };

        if (!usersMap.has(m.user_id)) usersMap.set(m.user_id, []);
        usersMap.get(m.user_id)!.push(row);
    }

    const people = [];

    for (const [user_id, months] of usersMap.entries()) {
        const actual = months.filter((m) => m.ord_lon_fore_skatt !== null);
        if (actual.length === 0) continue;

        const last = actual[actual.length - 1];

        const actualTotals = {
            ord: actual.reduce((s, m) => s + Number(m.ord_skatt ?? 0), 0),
            ass: actual.reduce((s, m) => s + Number(m.ass_skatt ?? 0), 0),
            fk: actual.reduce((s, m) => s + Number(m.fk_skatt ?? 0), 0),
            netto: actual.reduce(
                (s, m) =>
                    s +
                    Number(m.ord_nettolon ?? 0) +
                    Number(m.ass_nettolon ?? 0) +
                    Number(m.fk_nettolon ?? 0),
                0
            )
        };

        const remaining = 12 - actual.length;

        const forecastTotals = {
            ord: remaining * Number(last.ord_skatt ?? 0),
            ass: remaining * Number(last.ass_skatt ?? 0),
            fk: remaining * Number(last.fk_skatt ?? 0),
            netto:
                remaining *
                (Number(last.ord_nettolon ?? 0) +
                    Number(last.ass_nettolon ?? 0) +
                    Number(last.fk_nettolon ?? 0))
        };

        const total = {
            ord: actualTotals.ord + forecastTotals.ord,
            ass: actualTotals.ass + forecastTotals.ass,
            fk: actualTotals.fk + forecastTotals.fk,
            netto: actualTotals.netto + forecastTotals.netto
        };

        const summary = {
            årsinkomstHittills: actualTotals.netto,
            årsprognos: total.netto,
            rightTaxOrd: total.ord,
            rightTaxAssist: total.ass,
            rightTaxFK: total.fk,
            rightTaxTotal: total.ord + total.ass + total.fk,
            kommunalSkattÅr: total.ord + total.ass + total.fk,
            statligSkatt: 0,
            totalSkattBorde: total.ord + total.ass + total.fk,
            expectedPaidTax: actualTotals.ord + actualTotals.ass + actualTotals.fk,
            diff:
                (actualTotals.ord + actualTotals.ass + actualTotals.fk) -
                (total.ord + total.ass + total.fk)
        };

        people.push({
            user_id,
            name: nameMap.get(user_id) ?? 'Okänd',
            summary
        });
    }

    return {
        year,
        currentYear,
        people
    };
};
