import { redirect, fail } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    const { data, error } = await supabase
        .from('monthly_income')
        .select('*')
        .eq('user_id', locals.user.id)
        .order('month', { ascending: false });

    if (error) {
        console.error("LOAD INCOME ERROR:", error);
        return { incomes: [] };
    }

    return { incomes: data };
};

export const actions = {
    add: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');

        const supabase = locals.supabase;
        const form = await request.formData();

        const payload = {
            user_id: locals.user.id,
            month: form.get('month'),

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

        const { error } = await supabase.from('monthly_income').insert(payload);

        if (error) {
            console.error("ADD INCOME ERROR:", error, payload);
            return fail(400, { message: error.message });
        }

        throw redirect(303, '/incomes');
    },

    update: async ({ request, locals }) => {
        if (!locals.user) throw redirect(303, '/login');

        const supabase = locals.supabase;
        const form = await request.formData();
        const id = form.get('id');

        const payload = {
            month: form.get('month'),

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
            .from('monthly_income')
            .update(payload)
            .eq('id', id)
            .eq('user_id', locals.user.id);

        if (error) {
            console.error("UPDATE INCOME ERROR:", error, payload);
            return fail(400, { message: error.message });
        }

        throw redirect(303, '/incomes');
    }
};
