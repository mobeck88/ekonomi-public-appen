import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;

    if (!user) throw redirect(303, '/login');

    const token = params.token;

    const { data: household } = await supabase
        .from('households')
        .select('id')
        .eq('join_code', token)
        .maybeSingle();

    if (!household) {
        return { error: 'Hushåll hittades inte.' };
    }

    return { household };
};

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        const supabase = locals.supabase;
        const user = locals.user;

        if (!user) return fail(401, { error: 'Ingen användare inloggad.' });

        const form = await request.formData();
        const role = form.get('role');

        if (!role || (role !== 'member' && role !== 'guardian')) {
            return fail(400, { error: 'Ogiltig roll.' });
        }

        const token = params.token;

        const { data: household } = await supabase
            .from('households')
            .select('id')
            .eq('join_code', token)
            .maybeSingle();

        if (!household) {
            return fail(400, { error: 'Hushåll hittades inte.' });
        }

        const { error } = await supabase
            .from('household_members')
            .insert({
                household_id: household.id,
                user_id: user.id,
                role
            });

        if (error) {
            return fail(500, { error: 'Kunde inte lägga till dig i hushållet.' });
        }

        throw redirect(303, '/household');
    }
};
