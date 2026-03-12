import { redirect, fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

function sb(cookies) {
    const access_token = cookies.get('sb-access-token');
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${access_token}` } }
    });
}

/* -------------------------------------------------------
   LOAD – Hämta alla månader + alla tre sektioner
-------------------------------------------------------- */
export const load = async ({ locals, cookies }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { months: [] };

    const supabase = sb(cookies);

    // Hämta månader
    const { data: months } = await supabase
        .from('income_months')
        .select('*')
        .eq('household_id', householdId)
        .order('month', { ascending: false });

    if (!months) return { months: [] };

    // Hämta alla tre sektioner
    const { data: primary } = await supabase.from('income_primary_job').select('*');
    const { data: extra } = await supabase.from('income_extra_jobs').select('*');
    const { data: fk } = await supabase.from('income_fk').select('*');

    // Slå ihop per månad
    const enriched = months.map((m) => ({
        ...m,
        primary_job: primary?.find((p) => p.income_month_id === m.id) ?? null,
        extra_jobs: extra?.filter((e) => e.income_month_id === m.id) ?? [],
        fk: fk?.find((f) => f.income_month_id === m.id) ?? null
    }));

    return { months: enriched };
};

/* -------------------------------------------------------
   ACTIONS
-------------------------------------------------------- */
export const actions = {
    /* -----------------------------------------------
       Skapa månad
    ------------------------------------------------ */
    create_month: async ({ request, locals, cookies }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        if (!user) throw redirect(303, '/login');

        const supabase = sb(cookies);
        const form = await request.formData();

        const rawMonth = form.get('month');
        const month = rawMonth ? `${rawMonth}-01` : null;

        const { error } = await supabase.from('income_months').insert({
            household_id: householdId,
            user_id: user.id,
            month
        });

        if (error) return fail(400, { message: error.message });
        throw redirect(303, '/incomes');
    },

    /* -----------------------------------------------
       Spara ordinarie arbete
    ------------------------------------------------ */
    save_primary_job: async ({ request, locals, cookies }) => {
        const user = locals.user;
        const supabase = sb(cookies);
        const form = await request.formData();

        const income_month_id = form.get('income_month_id');

        const payload = {
            lon_fore_skatt: form.get('lon_fore_skatt') || null,
            franvaro: form.get('franvaro') || null,
            inbetald_skatt: form.get('inbetald_skatt') || null,
            frivillig_skatt: form.get('frivillig_skatt') || null,
            att_betala_ut: form.get('att_betala_ut') || null
        };

        // Finns redan?
        const { data: existing } = await supabase
            .from('income_primary_job')
            .select('id')
            .eq('income_month_id', income_month_id)
            .maybeSingle();

        let error;

        if (existing) {
            ({ error } = await supabase
                .from('income_primary_job')
                .update(payload)
                .eq('id', existing.id));
        } else {
            ({ error } = await supabase.from('income_primary_job').insert({
                income_month_id,
                user_id: user.id,
                ...payload
            }));
        }

        if (error) return fail(400, { message: error.message });
        throw redirect(303, '/incomes');
    },

    /* -----------------------------------------------
       Spara FK
    ------------------------------------------------ */
    save_fk: async ({ request, locals, cookies }) => {
        const user = locals.user;
        const supabase = sb(cookies);
        const form = await request.formData();

        const income_month_id = form.get('income_month_id');

        const payload = {
            ersattning_fore_skatt: form.get('ersattning_fore_skatt') || null,
            inbetald_skatt: form.get('inbetald_skatt') || null,
            att_betala_ut: form.get('att_betala_ut') || null
        };

        const { data: existing } = await supabase
            .from('income_fk')
            .select('id')
            .eq('income_month_id', income_month_id)
            .maybeSingle();

        let error;

        if (existing) {
            ({ error } = await supabase
                .from('income_fk')
                .update(payload)
                .eq('id', existing.id));
        } else {
            ({ error } = await supabase.from('income_fk').insert({
                income_month_id,
                user_id: user.id,
                ...payload
            }));
        }

        if (error) return fail(400, { message: error.message });
        throw redirect(303, '/incomes');
    },

    /* -----------------------------------------------
       Lägg till extra jobb
    ------------------------------------------------ */
    add_extra_job: async ({ request, locals, cookies }) => {
        const user = locals.user;
        const supabase = sb(cookies);
        const form = await request.formData();

        const payload = {
            income_month_id: form.get('income_month_id'),
            user_id: user.id,
            arbetsgivare: form.get('arbetsgivare'),
            lon_fore_skatt: form.get('lon_fore_skatt') || null,
            franvaro: form.get('franvaro') || null,
            inbetald_skatt: form.get('inbetald_skatt') || null,
            frivillig_skatt: form.get('frivillig_skatt') || null,
            att_betala_ut: form.get('att_betala_ut') || null
        };

        const { error } = await supabase.from('income_extra_jobs').insert(payload);
        if (error) return fail(400, { message: error.message });

        throw redirect(303, '/incomes');
    },

    /* -----------------------------------------------
       Uppdatera extra jobb
    ------------------------------------------------ */
    update_extra_job: async ({ request, locals, cookies }) => {
        const supabase = sb(cookies);
        const form = await request.formData();

        const id = form.get('id');

        const payload = {
            arbetsgivare: form.get('arbetsgivare'),
            lon_fore_skatt: form.get('lon_fore_skatt') || null,
            franvaro: form.get('franvaro') || null,
            inbetald_skatt: form.get('inbetald_skatt') || null,
            frivillig_skatt: form.get('frivillig_skatt') || null,
            att_betala_ut: form.get('att_betala_ut') || null
        };

        const { error } = await supabase
            .from('income_extra_jobs')
            .update(payload)
            .eq('id', id);

        if (error) return fail(400, { message: error.message });
        throw redirect(303, '/incomes');
    },

    /* -----------------------------------------------
       Ta bort extra jobb
    ------------------------------------------------ */
    delete_extra_job: async ({ request, locals, cookies }) => {
        const supabase = sb(cookies);
        const form = await request.formData();

        const id = form.get('id');

        const { error } = await supabase
            .from('income_extra_jobs')
            .delete()
            .eq('id', id);

        if (error) return fail(400, { message: error.message });
        throw redirect(303, '/incomes');
    }
};
