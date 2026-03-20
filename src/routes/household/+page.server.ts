import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const supabase = locals.supabase;
    const user = locals.user;
    const householdId = locals.householdId;

    if (!user) throw redirect(303, '/login');

    if (!householdId) {
        return {
            user,
            householdId: null,
            role: null,
            adults: 0,
            children: 0,
            childBirthdates: [],
            join_code: null
        };
    }

    const { data: membership } = await supabase
        .from('household_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('household_id', householdId)
        .single();

    const { data: household } = await supabase
        .from('households')
        .select('adults, children, join_code')
        .eq('id', householdId)
        .single();

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
        join_code: household?.join_code ?? null,
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

        if (!code || typeof code !== 'string') {
            return fail(400, { error: 'Du måste ange en hushållskod.' });
        }

        const { data: household } = await supabase
            .from('households')
            .select('id')
            .eq('join_code', code)
            .maybeSingle();

        if (!household) {
            return fail(404, { error: 'Hushåll hittades inte.' });
        }

        const { error: memberError } = await supabase.from('household_members').insert({
            household_id: household.id,
            user_id: user.id,
            role: 'member'
        });

        if (memberError) {
            return fail(500, { error: 'Kunde inte gå med i hushållet.' });
        }

        return { success: true };
    },

    generateInvite: async ({ locals }) => {
        const supabase = locals.supabase;
        const householdId = locals.householdId;

        if (!householdId) return fail(400, { error: 'Inget hushåll.' });

        const newCode = Math.random().toString(36).substring(2, 10);

        await supabase
            .from('households')
            .update({ join_code: newCode })
            .eq('id', householdId);

        return { join_code: newCode };
    },

    leaveHousehold: async ({ locals }) => {
        const supabase = locals.supabase;
        const user = locals.user;
        const householdId = locals.householdId;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll.' });

        const { data: membership } = await supabase
            .from('household_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('household_id', householdId)
            .single();

        if (!membership) return fail(400, { error: 'Du är inte medlem i detta hushåll.' });

        if (membership.role === 'owner') {
            return fail(400, { error: 'Ägare kan inte lämna sitt eget hushåll.' });
        }

        await supabase
            .from('household_members')
            .delete()
            .match({ household_id: householdId, user_id: user.id });

        throw redirect(303, '/household?left=1');
    },

    deleteHousehold: async ({ locals }) => {
        const supabase = locals.supabase;
        const user = locals.user;
        const householdId = locals.householdId;

        if (!householdId) return fail(400, { error: 'Inget hushåll.' });

        const { data: membership } = await supabase
            .from('household_members')
            .select('role')
            .eq('user_id', user.id)
            .eq('household_id', householdId)
            .single();

        if (!membership || membership.role !== 'owner') {
            return fail(403, { error: 'Endast ägaren kan ta bort hushållet.' });
        }

        await supabase.from('household_children').delete().eq('household_id', householdId);
        await supabase.from('household_members').delete().eq('household_id', householdId);
        await supabase.from('households').delete().eq('id', householdId);

        throw redirect(303, '/household?deleted=1');
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

        await supabase
            .from('households')
            .update({ adults, children })
            .eq('id', householdId);

        await supabase
            .from('household_children')
            .delete()
            .eq('household_id', householdId);

        const inserts: { household_id: string; birthdate: FormDataEntryValue }[] = [];
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
            await supabase.from('household_children').insert(inserts);
        }

        return {
            message: 'Hushållet uppdaterades.',
            adults,
            children,
            childBirthdates: inserts
        };
    }
};
