import { redirect } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load = async ({ locals, cookies, url }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');
    if (!householdId) throw redirect(303, '/setup-household');

    const access_token = cookies.get('sb-access-token');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        }
    });

    const currentYear = new Date().getFullYear();
    const year = Number(url.searchParams.get("year") ?? currentYear);

    // ⭐ Hämta hushållets medlemmar + namn
    const { data: members } = await supabase
        .from("household_members")
        .select("user_id, profiles(full_name)")
        .eq("household_id", householdId);

    if (!members || members.length === 0) {
        return { year, currentYear, people: [] };
    }

    // ⭐ Hämta statlig skatt-gräns (global)
    const { data: taxSettings } = await supabase
        .from("tax_settings")
        .select("*")
        .eq("year", year)
        .maybeSingle();

    const statligSkattGräns = taxSettings?.statlig_skatt_grans ?? 660400;

    // ⭐ Funktion: hämta rätt kommunalskatt från tabell
    const lookupTax = async (bruttolön) => {
        const { data: row } = await supabase
            .from("tax_table")
            .select("tax_amount")
            .eq("year", year)
            .lte("income_min", bruttolön)
            .gte("income_max", bruttolön)
            .maybeSingle();

        return row?.tax_amount ?? 0;
    };

    // ⭐ Funktion: beräkna sammanfattning för en person
    const calculateSummary = async (rows, isMemberOfChurch) => {
        if (!rows || rows.length === 0) return null;

        let årsinkomstHittills = 0;
        let totalSkattHittills = 0;

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

        const monthsCount = rows.length;
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

    // ⭐ Bygg people‑array dynamiskt
    const people = [];

    for (const member of members) {
        const userId = member.user_id;
        const fullName = member.profiles.full_name;

        // Hämta kyrkotillhörighet
        const { data: userTaxSettings } = await supabase
            .from("tax_user_settings")
            .select("is_member_of_church")
            .eq("user_id", userId)
            .eq("year", year)
            .maybeSingle();

        const isMemberOfChurch = userTaxSettings?.is_member_of_church ?? true;

        // Hämta inkomstrader
        const { data: rows } = await supabase
            .from("monthly_income")
            .select("*")
            .eq("user_id", userId)
            .gte("month", `${year}-01-01`)
            .lte("month", `${year}-12-31`)
            .order("month", { ascending: true });

        const summary = await calculateSummary(rows, isMemberOfChurch);

        people.push({
            name: fullName,
            user_id: userId,
            summary
        });
    }

    return {
        year,
        currentYear,
        people
    };
};
