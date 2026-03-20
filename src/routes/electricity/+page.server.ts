import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAccessContext } from '$lib/server/access';

export const load: PageServerLoad = async ({ locals, url }) => {
    const access = await getAccessContext(locals, url);

    if (!access.allowed) {
        return redirect(303, '/login');
    }

    const supabase = locals.supabase;
    const householdId = locals.householdId;

    if (!householdId) {
        return { entries: [], access };
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
        .eq('user_id', access.selectedUserId)
        .order('month', { ascending: false });

    return {
        entries: error ? [] : entries,
        access
    };
};

export const actions: Actions = {
    save: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);

        if (!access.allowed) {
            return redirect(303, '/login');
        }

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        if (!householdId) {
            return fail(400, { error: 'Inget hushåll kopplat.' });
        }

        const form = await request.formData();
        const selected_user_id = form.get('selected_user_id');

        if (!selected_user_id || typeof selected_user_id !== 'string') {
            return fail(400, { error: 'selected_user_id saknas.' });
        }

        const allowed = access.selectableMembers.some(
            (m: any) => m.user_id === selected_user_id
        );

        if (!allowed) {
            return fail(403, { error: 'Otillåten användare.' });
        }

        const month = form.get('month');
        const eon_amount = Number(form.get('eon_amount'));
        const tibber_amount = Number(form.get('tibber_amount'));

        const { error } = await supabase.from('electricity').upsert({
            household_id: householdId,
            user_id: selected_user_id,
            month: `${month}-01`,
            eon_amount,
            tibber_amount
        });

        if (error) {
            return fail(400, { error: error.message });
        }

        return { success: true };
    }
};
