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
        return { entries: [] };
    }

    const { data: entries, error } = await supabase
        .from('electricity')
        .select(`
            id,
            household_id,
            user_id,
            month,
            eon_amount,
            tibber_amount,
            created_at,
            profiles:user_id (
                full_name
            )
        `)
        .eq('household_id', householdId)
        .order('month', { ascending: false });

    if (error) {
        console.error("ELECTRICITY LOAD ERROR:", error);
        return { entries: [] };
    }

    return { entries };
};

export const actions: Actions = {
    save: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) return redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll kopplat.' });

        const form = await request.formData();

        const id = form.get('id');
        const month = form.get('month');
        const eon_amount = Number(form.get('eon_amount'));
        const tibber_amount = Number(form.get('tibber_amount'));

        const payload: any = {
            household_id: householdId,
            user_id: user.id,
            month: `${month}-01`,
            eon_amount,
            tibber_amount
        };

        if (id) {
            payload.id = Number(id);
        }

        const { error } = await supabase.from('electricity').upsert(payload);

        if (error) {
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
