import { redirect, fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';

export const load = async ({ locals, cookies }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { incomes: [] };

    const access_token = cookies.get('sb-access-token');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        }
    });

    const { data, error } = await supabase
        .from('incomes')
        .select('*')
        .eq('household_id', householdId)
        .order('month', { ascending: false });

    if (error) {
        console.error('LOAD INCOME ERROR:', error);
        return { incomes: [] };
    }

    return { incomes: data };
};

export const actions = {
    add: async ({ request, locals, cookies }) => {
        const user = locals.user;
        const householdId = locals.householdId;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Inget hushåll kopplat.' });

        const access_token = cookies.get('sb-access-token');

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            }
        });

        const form = await request.formData();

        const rawMonth = form.get('month') as string | null;
        const month = rawMonth ? `${rawMonth}-01` : null;

        const payload = {
            household_id: householdId,
            month,

            ord_lon_fore_skatt: Number(form.get('ord_lon_fore_skatt')) || null,
            ord_franvaro: Number(form.get('ord_franvaro')) || null,
            ord_skatt: Number(form.get('ord_skatt')) || null,
            ord_nettolon: Number(form.get('ord_nettolon')) || null,

            ass_lon_fore_skatt: Number(form.get('ass_lon_fore_skatt')) || null,
            ass_skatt: Number(form.get('ass_skatt')) || null,
            ass_frivillig_skatt: Number(form.get('ass_frivillig_skatt')) || null,
            ass_nettolon: Number(form.get('ass_nettolon')) || null,

            fk_lon_fore_skatt: Number(form.get('fk_lon_fore_skatt')) || null,
            fk_skatt: Number(form.get('fk_skatt')) || null,
            fk_nettolon: Number(form.get('fk_nettolon')) || null
        };

        const { error } = await supabase.from('incomes').insert(payload);

        if (error) {
            console.error('ADD INCOME ERROR:', error, payload);
            return fail(400, { message: error.message });
        }

        throw redirect(303, '/incomes');
    },

    update: async ({ request, locals, cookies }) => {
        const user = locals.user;
        const householdId = locals.householdId;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Inget hushåll kopplat.' });

        const access_token = cookies.get('sb-access-token');

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            }
        });

        const form = await request.formData();
        const id = form.get('id');

        const rawMonth = form.get('month') as string | null;
        const month = rawMonth ? `${rawMonth}-01` : null;

        const payload = {
            month,

            ord_lon_fore_skatt: Number(form.get('ord_lon_fore_skatt')) || null,
            ord_franvaro: Number(form.get('ord_franvaro')) || null,
            ord_skatt: Number(form.get('ord_skatt')) || null,
            ord_nettolon: Number(form.get('ord_nettolon')) || null,

            ass_lon_fore_skatt: Number(form.get('ass_lon_fore_skatt')) || null,
            ass_skatt: Number(form.get('ass_skatt')) || null,
            ass_frivillig_skatt: Number(form.get('ass_frivillig_skatt')) || null,
            ass_nettolon: Number(form.get('ass_nettolon')) || null,

            fk_lon_fore_skatt: Number(form.get('fk_lon_fore_skatt')) || null,
            fk_skatt: Number(form.get('fk_skatt')) || null,
            fk_nettolon: Number(form.get('fk_nettolon')) || null
        };

        const { error } = await supabase
            .from('incomes')
            .update(payload)
            .eq('id', id)
            .eq('household_id', householdId);

        if (error) {
            console.error('UPDATE INCOME ERROR:', error, payload);
            return fail(400, { message: error.message });
        }

        throw redirect(303, '/incomes');
    }
};
