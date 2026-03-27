import { redirect, fail } from '@sveltejs/kit';
import { getAccessContext } from '$lib/server/access';

export const load = async ({ locals, url }) => {
    const access = await getAccessContext(locals, url);
    if (!access.allowed) throw redirect(303, '/login');

    const supabase = locals.supabase;
    const householdId = locals.householdId;
    const selectedUserId = access.selectedUserId;

    const { data: companies } = await supabase
        .from('collection_companies')
        .select('*')
        .eq('household_id', householdId)
        .order('name', { ascending: true });

    const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('household_id', householdId)
        .eq('user_id', selectedUserId)
        .order('created_at', { ascending: false });

    const companyMap = new Map(
        (companies ?? []).map((c) => [c.id, c.name])
    );

    const enrichedDebts = (debts ?? []).map((d) => ({
        ...d,
        collection_company_name: d.collection_company_id
            ? companyMap.get(d.collection_company_id) ?? null
            : null
    }));

    return {
        access,
        debts: enrichedDebts,
        companies: companies ?? []
    };
};

function resolveTargetUserId(access, form: FormData): string {
    const selected = form.get('selected_user_id')?.toString();

    if (!selected) {
        return access.selectedUserId;
    }

    const allowed = (access.selectableMembers ?? []).map((m) => m.user_id);

    if (!allowed.includes(selected)) {
        throw redirect(303, '/login');
    }

    return selected;
}

export const actions = {
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

    create_debt: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const targetUserId = resolveTargetUserId(access, form);

        const rawCompanyId = form.get('collection_company_id')?.toString() ?? '';
        const collection_company_id =
            rawCompanyId === '' || rawCompanyId === '__new__' ? null : rawCompanyId;

        const amountRaw = form.get('amount')?.toString() ?? '';
        const amount = amountRaw ? Number(amountRaw) : NaN;

        const payload = {
            title: form.get('title')?.toString().trim() ?? '',
            original_company_name: form.get('original_company_name')?.toString().trim() ?? '',
            original_reference: form.get('original_reference')?.toString().trim() || null,
            collection_company_id,
            collection_reference: form.get('collection_reference')?.toString().trim() || null,
            amount,
            is_kronofogden: form.get('is_kronofogden') === 'on',
            household_id: householdId,
            user_id: targetUserId
        };

        if (!payload.title || !payload.original_company_name || !Number.isFinite(payload.amount)) {
            return fail(400, { message: 'Ogiltiga fält' });
        }

        const { error } = await supabase.from('debts').insert(payload);
        if (error) return fail(400, { message: error.message });

        throw redirect(303, `/debts?user_id=${encodeURIComponent(targetUserId)}`);
    },

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

        const rawCompanyId = form.get('collection_company_id')?.toString() ?? '';
        const collection_company_id =
            rawCompanyId === '' || rawCompanyId === '__new__' ? null : rawCompanyId;

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

        throw redirect(303, `/debts?user_id=${encodeURIComponent(targetUserId)}`);
    },

    delete_debt: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const debtId = form.get('debt_id')?.toString();
        if (!debtId) return fail(400, { message: 'Saknar debt_id' });

        const { error } = await supabase
            .from('debts')
            .delete()
            .eq('id', debtId)
            .eq('household_id', householdId)
            .eq('user_id', access.selectedUserId);

        if (error) return fail(400, { message: error.message });

        throw redirect(303, '/debts');
    }
};
