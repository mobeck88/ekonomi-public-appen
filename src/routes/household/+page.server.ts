import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');

    // Om användaren inte tillhör ett hushåll
    if (!householdId) {
        return {
            user,
            householdId: null,
            role: null,
            adults: 0,
            children: 0,
            childBirthdates: []
        };
    }

    // Hämta roll
    const { data: membership } = await supabase
        .from('household_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('household_id', householdId)
        .single();

    // Hämta hushållsinställningar
    const { data: household } = await supabase
        .from('households')
        .select('adults, children')
        .eq('id', householdId)
        .single();

    // Hämta barnens födelsedatum
    const { data: childRows } = await supabase
        .from('household_children')
        .select('id, birthdate')
        .eq('household_id', householdId)
        .order('id');

    return {
        user,
        householdId,
        role: membership?.role ?? null,
        adults: household?.adults ?? 0,
        children: household?.children ?? 0,
        childBirthdates: childRows ?? []
    };
};

export const actions: Actions = {
    join: async ({ request, locals }) => {
        const supabase = locals.supabase;
        const user = locals.user;

        if (!user) throw redirect(303, '/login');

        const form = await request.formData();
        const code = form.get('code');

        // Finns hushållet?
        const { data: household } = await supabase
            .from('households')
            .select('id')
            .eq('id', code)
            .single();

        if (!household) {
            return fail(404, { error: 'Hushåll hittades inte.' });
        }

        // Lägg till användaren
        const { error } = await supabase.from('household_members').insert({
            household_id: household.id,
            user_id: user.id,
            role: 'member'
        });

        if (error) {
            return fail(500, { error: 'Kunde inte gå med i hushållet.' });
        }

        return { success: true };
    },

    saveHousehold: async ({ request, locals }) => {
        const supabase = locals.supabase;
        const user = locals.user;
        const householdId = locals.householdId;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { message: 'Du tillhör inget hushåll.' });

        const form = await request.formData();

        const adults = Number(form.get('adults'));
        const children = Number(form.get('children'));

        // Uppdatera hushållet
        const { error: updateError } = await supabase
            .from('households')
            .update({ adults, children })
            .eq('id', householdId);

        if (updateError) {
            return fail(500, { message: 'Kunde inte uppdatera hushållet.' });
        }

        // Ta bort gamla barn
        await supabase
            .from('household_children')
            .delete()
            .eq('household_id', householdId);

        // Lägg till nya barn
        const inserts = [];
        for (let i = 0; i < children; i++) {
            const birthdate = form.get(`child_${i}_birthdate`);
            if (birthdate) {
                inserts.push({
                    household_id: householdId,
                    birthdate
                });
            }
        }

        if (inserts.length > 0) {
            const { error: insertError } = await supabase
                .from('household_children')
                .insert(inserts);

            if (insertError) {
                return fail(500, {
                    message: 'Kunde inte spara barnens födelsedatum.'
                });
            }
        }

        return { message: 'Hushållet uppdaterades.' };
    }
};
