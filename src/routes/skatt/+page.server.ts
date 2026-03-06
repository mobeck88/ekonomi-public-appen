import { supabase } from '$lib/supabaseClient';

export const load = async ({ url }) => {
    const currentYear = new Date().getFullYear();
    const year = Number(url.searchParams.get("year") ?? currentYear);

    const ANDREAS = "e01fef73-06ac-4652-9827-15820ff9198e";
    const HANNA = "9929ea93-2634-4fb6-b063-610f9e9b1e92";

    const people = [
        { name: "Andreas", user_id: ANDREAS },
        { name: "Hanna", user_id: HANNA }
    ];

    // Statlig skatt-gräns (global)
    const { data: taxSettings } = await supabase
        .from("tax_settings")
        .select("*")
        .eq("year", year)
        .maybeSingle();

    const statligSkattGräns = taxSettings?.statlig_skatt_grans ?? 660400;

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

    const calculateSummary = async (rows, isMemberOfChurch) => {
        if (!rows || rows.length === 0) return null;

        let årsinkomstHittills = 0;
        let totalSkattHittills = 0; // = rad 34 i Excel

        rows.forEach((row) => {
            const bruttoOrd = Number(row.ord_lon_fore_skatt ?? 0);
            const bruttoAssist = Number(row.ass_lon_fore_skatt ?? 0);
            const bruttoFK = Number(row.fk_lon_fore_skatt ?? 0);

            årsinkomstHittills += bruttoOrd + bruttoAssist + bruttoFK;

            // 33 = total skatt innevarande månad
            const månadensSkatt =
                Number(row.ord_skatt ?? 0) +
                Number(row.ass_skatt ?? 0) +
                Number(row.ass_frivillig_skatt ?? 0) +
                Number(row.fk_skatt ?? 0);

            // 34 = föregående 34 + innevarande 33
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

        // EXCEL: Förväntad inbetald årsskatt = 34 / månadens nummer * 12
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

    for (const person of people) {
        const { data: userTaxSettings } = await supabase
            .from("tax_user_settings")
            .select("is_member_of_church")
            .eq("user_id", person.user_id)
            .eq("year", year)
            .maybeSingle();

        const isMemberOfChurch = userTaxSettings?.is_member_of_church ?? true;

        const { data: rows } = await supabase
            .from("monthly_income")
            .select("*")
            .eq("user_id", person.user_id)
            .gte("month", `${year}-01-01`)
            .lte("month", `${year}-12-31`)
            .order("month", { ascending: true });

        person.summary = await calculateSummary(rows, isMemberOfChurch);
    }

    return {
        year,
        currentYear,
        people
    };
};
