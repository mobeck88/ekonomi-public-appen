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

    // 3. Hämta monthly_income för hushållets användare
    const { data: rows } = await supabase
        .from('monthly_income')
        .select('*')
        .in('user_id', userIds)
        .gte('month', `${year}-01-01`)
        .lte('month', `${year}-12-31`)
        .order('month', { ascending: true });

    if (!rows || rows.length === 0) {
        return {
            year,
            currentYear,
            people: []
        };
    }

    // Gruppéra per användare
    const usersMap = new Map<string, any[]>();
    for (const r of rows) {
        if (!usersMap.has(r.user_id)) usersMap.set(r.user_id, []);
        usersMap.get(r.user_id)!.push(r);
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
