import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getAccessContext } from '$lib/server/access';

export const load: PageServerLoad = async ({ locals, url }) => {
    const access = await getAccessContext(locals, url);
    if (!access.allowed) throw redirect(303, '/login');

    const supabase = locals.supabase;
    const householdId = locals.householdId;
    const selectedUserId = access.selectedUserId;

    // ⭐ Hämta inkassobolag
    const { data: companies } = await supabase
        .from('collection_companies')
        .select('*')
        .eq('household_id', householdId)
        .order('name', { ascending: true });

    // ⭐ Hämta skulder
    const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('household_id', householdId)
        .eq('user_id', selectedUserId);

    // ⭐ Gruppering och totalsummor
    const grouped: Record<string, any[]> = {};
    const totals: Record<string, number> = {};

    for (const d of debts ?? []) {
        const key = d.collection_company_id ?? 'none';

        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(d);

        if (!totals[key]) totals[key] = 0;
        totals[key] += Number(d.amount ?? 0);
    }

    // ⭐ Kronofogden-lista
    const krono = (debts ?? []).filter((d) => d.is_kronofogden);

    return {
        access,
        companies: companies ?? [],
        grouped,
        totals,
        krono
    };
};

// ⭐ Hjälpfunktion för att säkerställa att användaren får redigera rätt person
function resolveTargetUserId(access: any, form: FormData): string {
    const selected = form.get('selected_user_id')?.toString();
    if (!selected) return access.selectedUserId;

    const allowed = (access.selectableMembers ?? []).map((m: any) => m.user_id);
    if (!allowed.includes(selected)) throw redirect(303, '/login');

    return selected;
}

export const actions: Actions = {
    // ⭐ Skapa inkassobolag inline
    create_company: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const name = form.get('name')?.toString().trim();
        if (!name) return fail(400, { message: 'Namn saknas' });

        const { data, error } = await supabase
            .from('collection_companies')
            .insert({
                household_id: householdId,
                user_id: access.currentUserId,
                name
            })
            .select('*')
            .single();

        if (error || !data) {
            return fail(500, { message: error?.message ?? 'Kunde inte skapa bolag' });
        }

        return new Response(JSON.stringify(data), {
            headers: { 'Content-Type': 'application/json' }
        });
    },

    // ⭐ Uppdatera skuld
    update_debt: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const targetUserId = resolveTargetUserId(access, form);

        const debtId = form.get('debt_id')?.toString();
        if (!debtId) return fail(400, { message: 'Saknar debt_id' });

        // ⭐ Hantera inkassobolag
        const rawCompanyId = form.get('collection_company_id')?.toString() ?? '';
        const collection_company_id =
            rawCompanyId === '' || rawCompanyId === '__new__' ? null : rawCompanyId;

        // ⭐ Belopp
        const amountRaw = form.get('amount')?.toString() ?? '';
        const amount = amountRaw ? Number(amountRaw) : NaN;

        const payload = {
            title: form.get('title')?.toString().trim() ?? '',
            original_company_name: form.get('original_company_name')?.toString().trim() ?? '',
            original_reference: form.get('original_reference')?.toString().trim() || null,
            collection_company_id,
            collection_reference: form.get('collection_reference')?.toString().trim() || null,
            amount,
            is_kronofogden: form.get('is_kronofogden') === 'on'
        };

        if (!payload.title || !payload.original_company_name || !Number.isFinite(payload.amount)) {
            return fail(400, { message: 'Ogiltiga fält' });
        }

        const { error } = await supabase
            .from('debts')
            .update(payload)
            .eq('id', debtId)
            .eq('household_id', householdId)
            .eq('user_id', targetUserId);

        if (error) return fail(400, { message: error.message });

        throw redirect(303, '/debtsview');
    },

    // ⭐ Ta bort skuld
    delete_debt: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const debtId = form.get('debt_id')?.toString();
        const targetUserId = resolveTargetUserId(access, form);

        if (!debtId) return fail(400, { message: 'Saknar debt_id' });

        const { error } = await supabase
            .from('debts')
            .delete()
            .eq('id', debtId)
            .eq('household_id', householdId)
            .eq('user_id', targetUserId);

        if (error) return fail(400, { message: error.message });

        throw redirect(303, '/debtsview');
    }
};
