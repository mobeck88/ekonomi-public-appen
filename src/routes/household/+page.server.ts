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
        .select('id, role')
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

    // ⭐ LEAVE HOUSEHOLD — invariant-säker
    leaveHousehold: async ({ locals }) => {
        const supabase = locals.supabase;
        const user = locals.user;
        const householdId = locals.householdId;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return fail(400, { error: 'Inget hushåll.' });

        const { data: membership } = await supabase
            .from('household_members')
            .select('id, role')
            .eq('user_id', user.id)
            .eq('household_id', householdId)
            .single();

        if (!membership) return fail(400, { error: 'Du är inte medlem i detta hushåll.' });

        if (membership.role === 'owner') {
            return fail(400, { error: 'Ägare kan inte lämna sitt eget hushåll.' });
        }

        // 1. Ta bort household_members-raden
        await supabase
            .from('household_members')
            .delete()
            .eq('id', membership.id);

        // 2. Kolla om användaren är med i fler hushåll
        const { data: remainingMemberships } = await supabase
            .from('household_members')
            .select('id')
            .eq('user_id', user.id);

        // 3. Om inga hushåll kvar → ta bort profilen
        if (!remainingMemberships || remainingMemberships.length === 0) {
            await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);
        }

        throw redirect(303, '/household?left=1');
    },

    // ⭐ DELETE HOUSEHOLD — invariant-säker
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

        // 1. Hämta alla medlemmar innan vi raderar
        const { data: members } = await supabase
            .from('household_members')
            .select('user_id')
            .eq('household_id', householdId);

        // 2. Ta bort barn
        await supabase.from('household_children').delete().eq('household_id', householdId);

        // 3. Ta bort medlemmar
        await supabase.from('household_members').delete().eq('household_id', householdId);

        // 4. Ta bort hushållet
        await supabase.from('households').delete().eq('id', householdId);

        // 5. Ta bort profiler för användare som nu inte längre är med i något hushåll
        for (const m of members ?? []) {
            const { data: remaining } = await supabase
                .from('household_members')
                .select('id')
                .eq('user_id', m.user_id);

            if (!remaining || remaining.length === 0) {
                await supabase
                    .from('profiles')
                    .delete()
                    .eq('id', m.user_id);
            }
        }

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
