import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
    if (!locals.user) throw redirect(303, '/login');

    const supabase = locals.supabase;

    const { data } = await supabase
        .from('monthly_income')
        .select('*')
        .eq('user_id', locals.user.id)
        .order('month', { ascending: false });

    return { incomes: data };
};

export const actions = {
    add: async ({ request, locals, cookies }) => {
        if (!locals.user) throw redirect(303, '/login');

        const supabase = locals.supabase;

        // ⭐ KORREKT sätt att läsa cookies i actions
        const access_token = cookies.get('sb-access-token');
        if (access_token) {
            supabase.auth.setAuth(access_token);
        }

        const form = await request.formData();

        const payload = {
            user_id: locals.user.id,
            month: form.get('month'),

            ord_lon_fore_skatt: form.get('ord_lon_fore_skatt') || null,
            ord_franvaro: form.get('ord_franvaro') || null,
            ord_skatt: form.get('ord_skatt') || null,
            ord_nettolon: form.get('ord_nettolon') || null,

            ass_lon_fore_skatt: form.get('ass_lon_fore_skatt') || null,
            ass_skatt: form.get('ass_skatt') || null,
            ass_frivillig_skatt: form.get('ass_frivillig_skatt') || null,
            ass_nettolon: form.get('ass_nettolon') || null,

            fk_lon_fore_skatt: form.get('fk_lon_fore_skatt') || null,
            fk_skatt: form.get('fk_skatt') || null,
            fk_nettolon: form.get('fk_nettolon') || null
        };

        await supabase.from('monthly_income').insert(payload);
        throw redirect(303, '/incomes');
    },

    update: async ({ request, locals, cookies }) => {
        if (!locals.user) throw redirect(303, '/login');

        const supabase = locals.supabase;

        // ⭐ KORREKT sätt att läsa cookies i actions
        const access_token = cookies.get('sb-access-token');
        if (access_token) {
            supabase.auth.setAuth(access_token);
        }

        const form = await request.formData();
        const id = form.get('id');

        const payload = {
            month: form.get('month'),

            ord_lon_fore_skatt: form.get('ord_lon_fore_skatt') || null,
            ord_franvaro: form.get('ord_franvaro') || null,
            ord_skatt: form.get('ord_skatt') || null,
            ord_nettolon: form.get('ord_nettolon') || null,

            ass_lon_fore_skatt: form.get('ass_lon_fore_skatt') || null,
            ass_skatt: form.get('ass_skatt') || null,
            ass_frivillig_skatt: form.get('ass_frivillig_skatt') || null,
            ass_nettolon: form.get('ass_nettolon') || null,

            fk_lon_fore_skatt: form.get('fk_lon_fore_skatt') || null,
            fk_skatt: form.get('fk_skatt') || null,
            fk_nettolon: form.get('fk_nettolon') || null
        };

        await supabase
            .from('monthly_income')
            .update(payload)
            .eq('id', id)
            .eq('user_id', locals.user.id);

        throw redirect(303, '/incomes');
    }
};
