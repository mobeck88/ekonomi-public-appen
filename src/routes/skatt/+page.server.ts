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

    // 5. Hämta globala skatteinställningar (statlig skatt-gräns)
    const { data: taxSettings } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('year', year)
        .maybeSingle();

    const statligSkattGräns = taxSettings?.statlig_skatt_grans ?? 660400;

    // Hjälpfunktion: slå upp rätt skatt för ordinarie arbete i tax_table
    const lookupTax = async (bruttolön: number) => {
        if (!bruttolön || bruttolön <= 0) return 0;

        const { data: row } = await supabase
            .from('tax_table')
            .select('tax_amount')
            .eq('year', year)
            .lte('income_min', bruttolön)
            .gte('income_max', bruttolön)
            .maybeSingle();

        return row?.tax_amount ?? 0;
    };

    // Gruppéring per användare: bygg "rows" i samma form som gamla monthly_income
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

    // Portad logik från din "korrekta" serverfil
    const calculateSummary = async (rows: any[], isMemberOfChurch: boolean) => {
        if (!rows || rows.length === 0) return null;

        let årsinkomstHittills = 0;      // brutto hittills
        let totalSkattHittills = 0;      // rad 34 i Excel (total skatt hittills)

        rows.forEach((row) => {
            const bruttoOrd = Number(row.ord_lon_fore_skatt ?? 0);
            const bruttoAssist = Number(row.ass_lon_fore_skatt ?? 0);
            const bruttoFK = Number(row.fk_lon_fore_skatt ?? 0);

            årsinkomstHittills += bruttoOrd + bruttoAssist + bruttoFK;

            const månadensSkatt =
                Number(row.ord_skatt ?? 0) +
                Number(row.ass_skatt ?? 0) +
                Number(row.ass_frivillig_skatt ?? 0) +
                Number(row.fk_skatt ?? 0);

            totalSkattHittills += månadensSkatt;
        });

        const monthsCount = rows.length; // månadens nummer
        const årsprognos = (årsinkomstHittills / monthsCount) * 12;

        const last = rows[rows.length - 1];

        const lastOrdBrutto =
            Number(last.ord_lon_fore_skatt ?? 0) -
            Number(last.ord_franvaro ?? 0);

        const lastAssistBrutto = Number(last.ass_lon_fore_skatt ?? 0);
        const lastFKBrutto = Number(last.fk_lon_fore_skatt ?? 0);

        const rightTaxOrd = await lookupTax(lastOrdBrutto);
        const rightTaxAssist = lastAssistBrutto * 0.30;
        const rightTaxFK = Number(last.fk_skatt ?? 0);

        const rightTaxTotal = rightTaxOrd + rightTaxAssist + rightTaxFK;

        const årsskattMedKyrko = rightTaxTotal * 12;
        const kyrkoavgiftÅr = isMemberOfChurch ? 0 : årsprognos * 0.01;
        const kommunalSkattÅr = årsskattMedKyrko - kyrkoavgiftÅr;

        const statligSkatt = Math.max(0, (årsprognos - statligSkattGräns) * 0.20);

        const totalSkattBorde = kommunalSkattÅr + statligSkatt;

        // Förväntad inbetald årsskatt = 34 / månadens nummer * 12
        const expectedPaidTax = (totalSkattHittills / monthsCount) * 12;

        const diff = expectedPaidTax - totalSkattBorde;

        return {
            årsinkomstHittills,
            årsprognos,
            rightTaxOrd,
            rightTaxAssist,
            rightTaxFK,
            rightTaxTotal,
            kommunalSkattÅr,
            statligSkatt,
            totalSkattBorde,
            expectedPaidTax,
            diff
        };
    };

    const people: { user_id: string; name: string; summary: any | null }[] = [];

    for (const [user_id, rows] of usersMap.entries()) {
        // Hämta användarens skatteinställningar (kyrkoavgift)
        const { data: userTaxSettings } = await supabase
            .from('tax_user_settings')
            .select('is_member_of_church')
            .eq('user_id', user_id)
            .eq('year', year)
            .maybeSingle();

        const isMemberOfChurch = userTaxSettings?.is_member_of_church ?? true;

        const summary = await calculateSummary(rows, isMemberOfChurch);

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
