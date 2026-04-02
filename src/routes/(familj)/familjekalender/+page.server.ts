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

    const { data: attendees, error: attendeesError } = await supabase
        .from('family_calendar_event_attendees')
        .select('event_id, household_member_id');

    if (attendeesError) console.error('Error loading attendees', attendeesError);

    const attendeesByEvent = new Map<string, string[]>();
    (attendees ?? []).forEach((a) => {
        if (!attendeesByEvent.has(a.event_id)) attendeesByEvent.set(a.event_id, []);
        attendeesByEvent.get(a.event_id)!.push(a.household_member_id);
    });

    const members = access.selectableMembers ?? [];

    const memberColor = new Map<string, string>();
    members.forEach((m: any) => {
        if (m.color) memberColor.set(m.id, m.color);
    });

    const SHARED_COLOR = '#8884FF';
    const DEFAULT_COLOR = '#0078ff';

    const events = (eventsRaw ?? []).map((e: any) => {
        const evAtt = attendeesByEvent.get(e.id) ?? [];

        let color = DEFAULT_COLOR;

        if (evAtt.length === 1) {
            const c = memberColor.get(evAtt[0]);
            if (c) color = c;
        } else if (evAtt.length > 1) {
            color = SHARED_COLOR;
        }

        return {
            ...e,
            attendees: evAtt,
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

function parseAttendees(value: FormDataEntryValue | null): string[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(String(value));
        if (Array.isArray(parsed)) return parsed;
        return [];
    } catch {
        return [];
    }
}

function buildRRule(
    recurrence_pattern: string | null,
    start: string,
    recurrence_end: string | null
): string | null {
    if (!recurrence_pattern || recurrence_pattern === 'none') return null;

    const startDate = new Date(start);
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
        const attendees = parseAttendees(form.get('attendees'));

        const recurrence_pattern = (form.get('recurrence_pattern') as string | null) ?? 'none';
        const recurrence_end = (form.get('recurrence_end') as string | null) ?? null;

        const recurrence_rule = buildRRule(
            recurrence_pattern === 'none' ? null : recurrence_pattern,
            start,
            recurrence_end
        );
        const is_recurring = !!recurrence_rule;

        const { data, error } = await supabase
            .from('family_calendar_events')
            .insert({
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
            })
            .select()
            .single();

        if (error) {
            console.error('create event error', error);
            return fail(400, { message: error.message });
        }

        await supabase.from('family_calendar_event_attendees').delete().eq('event_id', data.id);

        if (is_shared && attendees.length) {
            await supabase.from('family_calendar_event_attendees').insert(
                attendees.map((id) => ({
                    event_id: data.id,
                    household_member_id: id
                }))
            );
        } else {
            const me = access.selectableMembers.find((m: any) => m.user_id === access.currentUserId);
            if (me) {
                await supabase.from('family_calendar_event_attendees').insert({
                    event_id: data.id,
                    household_member_id: me.id
                });
            }
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
        const attendees = parseAttendees(form.get('attendees'));

        const recurrence_pattern = (form.get('recurrence_pattern') as string | null) ?? 'none';
        const recurrence_end = (form.get('recurrence_end') as string | null) ?? null;

        const recurrence_rule = buildRRule(
            recurrence_pattern === 'none' ? null : recurrence_pattern,
            start,
            recurrence_end
        );
        const is_recurring = !!recurrence_rule;

        await supabase
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

        await supabase.from('family_calendar_event_attendees').delete().eq('event_id', event_id);

        if (is_shared && attendees.length) {
            await supabase.from('family_calendar_event_attendees').insert(
                attendees.map((id) => ({
                    event_id,
                    household_member_id: id
                }))
            );
        } else {
            const me = access.selectableMembers.find((m: any) => m.user_id === access.currentUserId);
            if (me) {
                await supabase.from('family_calendar_event_attendees').insert({
                    event_id,
                    household_member_id: me.id
                });
            }
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

        await supabase
            .from('family_calendar_events')
            .delete()
            .eq('id', event_id)
            .eq('household_id', householdId);

        await supabase.from('family_calendar_event_attendees').delete().eq('event_id', event_id);

        return { success: true };
    }
};
