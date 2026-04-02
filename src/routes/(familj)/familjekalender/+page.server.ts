import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

function shiftDate(base: Date, view: string, direction: string) {
    const d = new Date(base);
    const dir = direction === 'next' ? 1 : -1;

    if (view === 'day') {
        d.setDate(d.getDate() + dir);
        return d;
    }

    if (view === 'week') {
        d.setDate(d.getDate() + dir * 7);
        return d;
    }

    d.setMonth(d.getMonth() + dir);
    return d;
}

function getRange(view: string, base: Date) {
    if (view === 'day') {
        const start = new Date(base);
        start.setHours(0, 0, 0, 0);

        const end = new Date(base);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    if (view === 'week') {
        const start = new Date(base);
        start.setDate(base.getDate() - ((base.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59);

    return { start, end };
}

export const load: PageServerLoad = async ({ locals, url }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, '/login');
    if (!householdId) return { events: [], attendees: [], exceptions: [], view: 'week' };

    const view = url.searchParams.get('view') ?? 'week';
    const shift = url.searchParams.get('shift');

    const base = new Date();
    const shifted = shift ? shiftDate(base, view, shift) : base;
    const { start, end } = getRange(view, shifted);

    const startISO = start.toISOString();
    const endISO = end.toISOString();

    const { data: eventsRaw } = await supabase
        .from('family_calendar_events')
        .select('*')
        .eq('household_id', householdId)
        .lte('start', endISO)
        .gte('end', startISO);

    const eventIds = eventsRaw?.map((e) => e.id) ?? [];

    const { data: attendees } = await supabase
        .from('family_calendar_event_attendees')
        .select('event_id, household_member_id');

    const { data: members } = await supabase
        .from('household_members')
        .select('id, user_id, color')
        .eq('household_id', householdId);

    const { data: exceptions } = await supabase
        .from('family_calendar_event_exceptions')
        .select('*')
        .in('parent_event_id', eventIds);

    const memberById = new Map<string, { id: string; user_id: string | null; color: string | null }>();
    const colorByUserId = new Map<string, string>();

    (members ?? []).forEach((m: any) => {
        memberById.set(m.id, m);
        if (m.user_id && m.color) colorByUserId.set(m.user_id, m.color);
    });

    const attendeesByEvent = new Map<string, any[]>();
    (attendees ?? []).forEach((a: any) => {
        if (!attendeesByEvent.has(a.event_id)) attendeesByEvent.set(a.event_id, []);
        attendeesByEvent.get(a.event_id)!.push(a);
    });

    const SHARED_COLOR = '#8884FF';
    const DEFAULT_COLOR = '#0078ff';

    const events = (eventsRaw ?? []).map((e: any) => {
        const evAtt = attendeesByEvent.get(e.id) ?? [];
        let color = DEFAULT_COLOR;

        if (evAtt.length === 1) {
            const member = memberById.get(evAtt[0].household_member_id);
            if (member?.color) color = member.color;
        } else if (evAtt.length > 1) {
            color = SHARED_COLOR;
        } else if (e.created_by_user_id && colorByUserId.has(e.created_by_user_id)) {
            color = colorByUserId.get(e.created_by_user_id)!;
        }

        return { ...e, color };
    });

    return {
        events,
        attendees: attendees ?? [],
        exceptions: exceptions ?? [],
        view
    };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return { error: 'Inget hushåll kopplat.' };

        const data = await request.formData();

        const title = data.get('title');
        const description = data.get('description');
        const start = data.get('start');
        const end = data.get('end');
        const is_shared = data.get('is_shared') === 'true';
        const attendees = JSON.parse(data.get('attendees') || '[]');
        const recurrence_rule = data.get('recurrence_rule');
        const recurrence_end = data.get('recurrence_end');
        const reminders_minutes = JSON.parse(data.get('reminders_minutes') || '[]');

        const { data: event, error: eventError } = await supabase
            .from('family_calendar_events')
            .insert({
                household_id: householdId,
                created_by_user_id: user.id,
                title,
                description,
                start,
                end,
                is_shared,
                reminders_minutes,
                recurrence_rule,
                recurrence_end,
                is_recurring: recurrence_rule ? true : false
            })
            .select()
            .single();

        if (eventError) return { error: eventError.message };

        if (attendees.length) {
            await supabase.from('family_calendar_event_attendees').insert(
                attendees.map((m: string) => ({
                    event_id: event.id,
                    household_member_id: m
                }))
            );
        }

        return { success: true };
    },

    update: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return { error: 'Inget hushåll kopplat.' };

        const data = await request.formData();

        const event_id = data.get('event_id');
        const update_type = data.get('update_type');
        const date = data.get('date');
        const title = data.get('title');
        const description = data.get('description');
        const start = data.get('start');
        const end = data.get('end');
        const reminders_minutes = JSON.parse(data.get('reminders_minutes') || '[]');

        if (update_type === 'single') {
            const { error } = await supabase.from('family_calendar_event_exceptions').insert({
                parent_event_id: event_id,
                exception_date: date,
                title,
                description,
                start,
                end,
                reminders_minutes
            });

            if (error) return { error: error.message };
            return { success: true };
        }

        const { error } = await supabase
            .from('family_calendar_events')
            .update({
                title,
                description,
                start,
                end,
                reminders_minutes
            })
            .eq('id', event_id);

        if (error) return { error: error.message };

        return { success: true };
    },

    delete: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, '/login');
        if (!householdId) return { error: 'Inget hushåll kopplat.' };

        const data = await request.formData();

        const event_id = data.get('event_id');
        const delete_type = data.get('delete_type');
        const date = data.get('date');

        if (delete_type === 'single') {
            const { error } = await supabase.from('family_calendar_event_exceptions').insert({
                parent_event_id: event_id,
                exception_date: date,
                is_cancelled: true
            });

            if (error) return { error: error.message };
            return { success: true };
        }

        const { error } = await supabase
            .from('family_calendar_events')
            .delete()
            .eq('id', event_id);

        if (error) return { error: error.message };

        return { success: true };
    }
};
