import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';

export const load: PageServerLoad = async ({ request, cookies }) => {
    const supabase = createServerClient(
        process.env.PUBLIC_SUPABASE_URL!,
        process.env.PUBLIC_SUPABASE_ANON_KEY!,
        { cookies }
    );

    const {
        data: { user }
    } = await supabase.auth.getUser();

    if (!user) throw redirect(303, '/login');

    // Hämta medlemmar
    const { data: members, error: membersError } = await supabase
        .from('household_members')
        .select('user_id, profiles(full_name)')
        .eq('household_id', user.user_metadata.household_id);

    if (membersError) {
        console.error('membersError', membersError);
        return fail(500, { error: 'Kunde inte ladda medlemmar' });
    }

    return { members };
};

export const actions: Actions = {
    default: async ({ request, cookies }) => {
        const supabase = createServerClient(
            process.env.PUBLIC_SUPABASE_URL!,
            process.env.PUBLIC_SUPABASE_ANON_KEY!,
            { cookies }
        );

        const {
            data: { user }
        } = await supabase.auth.getUser();

        if (!user) return fail(401, { error: 'Ej inloggad' });

        const form = await request.formData();

        const title = form.get('title')?.toString().trim();
        const description = form.get('description')?.toString().trim() || null;
        const amount_raw = form.get('amount')?.toString();
        const interval_raw = form.get('interval_months')?.toString();
        const owner = form.get('owner')?.toString();
        const start_raw = form.get('start_month')?.toString();

        // ⭐ Validering (fixar 22P02)
        if (!title) return fail(400, { error: 'Titel saknas' });
        if (!amount_raw || isNaN(Number(amount_raw))) return fail(400, { error: 'Ogiltigt belopp' });
        if (!interval_raw || isNaN(Number(interval_raw))) return fail(400, { error: 'Ogiltigt intervall' });
        if (!owner) return fail(400, { error: 'Ägare saknas' });
        if (!start_raw || !/^\d{4}-\d{2}$/.test(start_raw)) {
            return fail(400, { error: 'Startmånad saknas eller ogiltig' });
        }

        // ⭐ Konvertering (stabil)
        const amount = Number(amount_raw);
        const interval_months = Number(interval_raw);
        const start_month = `${start_raw}-01`; // garanterat giltigt nu

        const household_id = user.user_metadata.household_id;

        // ⭐ Insert
        const { error: insertError } = await supabase.from('expenses').insert({
            title,
            description,
            amount,
            interval_months,
            owner,
            start_month,
            end_month: null,
            household_id
        });

        if (insertError) {
            console.error('insertError', insertError);
            return fail(500, { error: 'Kunde inte skapa utgift' });
        }

        throw redirect(303, '/expenses');
    }
};
