import { redirect, fail } from '@sveltejs/kit';
import { getAccessContext } from '$lib/server/access';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    const access = await getAccessContext(locals, url);
    if (!access.allowed) throw redirect(303, '/login');

    const supabase = locals.supabase;
    const householdId = locals.householdId;

    const { data: eventsRaw, error: eventsError } = await supabase
        .from('family_calendar_events')
        .select('*')
        .eq('household_id', householdId)
        .order('start', { ascending: true });

    if (eventsError) console.error('Error loading events', eventsError);

    const members = access.selectableMembers ?? [];

    const memberColor = new Map<string, string>();
    const memberByUserId = new Map<string, any>();

    members.forEach((m: any) => {
        if (m.color) memberColor.set(m.id, m.color);
        if (m.user_id) memberByUserId.set(m.user_id, m);
    });

    const SHARED_COLOR = '#8884FF';
    const DEFAULT_COLOR = '#0078ff';

    const events = (eventsRaw ?? []).map((e: any) => {
        let color = DEFAULT_COLOR;

        if (e.is_shared) {
            color = SHARED_COLOR;
        } else if (e.created_by_user_id) {
            const ownerMember = memberByUserId.get(e.created_by_user_id);
            if (ownerMember?.color) color = ownerMember.color;
        }

        return {
            ...e,
            color
        };
    });

    return {
        access,
        members,
        events
    };
};

function parseBoolean(value: FormDataEntryValue | null): boolean {
    if (!value) return false;
    const v = String(value).toLowerCase();
    return v === 'true' || v === 'on' || v === '1';
}

function buildRRule(
    recurrence_pattern: string | null,
    start: string,
    recurrence_end: string | null
): string | null {
    if (!recurrence_pattern || recurrence_pattern === 'none') return null;

    const untilPart = recurrence_end
        ? (() => {
                const d = new Date(recurrence_end);
                const y = d.getUTCFullYear();
                const m = String(d.getUTCMonth() + 1).padStart(2, '0');
                const day = String(d.getUTCDate()).padStart(2, '0');
                return `;UNTIL=${y}${m}${day}T000000Z`;
          })()
        : '';

    let rule = '';

    switch (recurrence_pattern) {
        case 'daily_1':
            rule = 'FREQ=DAILY';
            break;
        case 'daily_2':
            rule = 'FREQ=DAILY;INTERVAL=2';
            break;
        case 'weekly_1':
            rule = 'FREQ=WEEKLY';
            break;
        case 'weekly_2':
            rule = 'FREQ=WEEKLY;INTERVAL=2';
            break;
        case 'weekly_3':
            rule = 'FREQ=WEEKLY;INTERVAL=3';
            break;
        case 'weekly_4':
            rule = 'FREQ=WEEKLY;INTERVAL=4';
            break;
        case 'monthly_1':
            rule = 'FREQ=MONTHLY';
            break;
        case 'monthly_2':
            rule = 'FREQ=MONTHLY;INTERVAL=2';
            break;
        case 'monthly_3':
            rule = 'FREQ=MONTHLY;INTERVAL=3';
            break;
        case 'halfyear_1':
            rule = 'FREQ=MONTHLY;INTERVAL=6';
            break;
        case 'yearly_1':
            rule = 'FREQ=YEARLY';
            break;
        default:
            return null;
    }

    return rule + untilPart;
}

export const actions: Actions = {
    create: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();

        const title = (form.get('title') as string | null) ?? '';
        const description = (form.get('description') as string | null) ?? '';
        const start = (form.get('start') as string | null) ?? '';
        const end = (form.get('end') as string | null) ?? '';
        const is_shared = parseBoolean(form.get('is_shared'));

        const recurrence_pattern = (form.get('recurrence_pattern') as string | null) ?? 'none';
        const recurrence_end = (form.get('recurrence_end') as string | null) ?? null;

        const recurrence_rule = buildRRule(
            recurrence_pattern === 'none' ? null : recurrence_pattern,
            start,
            recurrence_end
        );
        const is_recurring = !!recurrence_rule;

        const { error } = await supabase.from('family_calendar_events').insert({
            household_id: householdId,
            created_by_user_id: access.currentUserId,
            title,
            description,
            start,
            end,
            is_shared,
            is_recurring,
            recurrence_rule,
            recurrence_end: recurrence_end ? recurrence_end : null
        });

        if (error) {
            console.error('create event error', error);
            return fail(400, { message: error.message });
        }

        return { success: true };
    },

    update: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();

        const event_id = (form.get('event_id') as string | null) ?? '';
        const title = (form.get('title') as string | null) ?? '';
        const description = (form.get('description') as string | null) ?? '';
        const start = (form.get('start') as string | null) ?? '';
        const end = (form.get('end') as string | null) ?? '';
        const is_shared = parseBoolean(form.get('is_shared'));

        const recurrence_pattern = (form.get('recurrence_pattern') as string | null) ?? 'none';
        const recurrence_end = (form.get('recurrence_end') as string | null) ?? null;

        const recurrence_rule = buildRRule(
            recurrence_pattern === 'none' ? null : recurrence_pattern,
            start,
            recurrence_end
        );
        const is_recurring = !!recurrence_rule;

        const { error } = await supabase
            .from('family_calendar_events')
            .update({
                title,
                description,
                start,
                end,
                is_shared,
                is_recurring,
                recurrence_rule,
                recurrence_end: recurrence_end ? recurrence_end : null
            })
            .eq('id', event_id)
            .eq('household_id', householdId);

        if (error) {
            console.error('update event error', error);
            return fail(400, { message: error.message });
        }

        return { success: true };
    },

    delete: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const form = await request.formData();
        const event_id = (form.get('event_id') as string | null) ?? '';

        const { error } = await supabase
            .from('family_calendar_events')
            .delete()
            .eq('id', event_id)
            .eq('household_id', householdId);

        if (error) {
            console.error('delete event error', error);
            return fail(400, { message: error.message });
        }

        return { success: true };
    }
};
