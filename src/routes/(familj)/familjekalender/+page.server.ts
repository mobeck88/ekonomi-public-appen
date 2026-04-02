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

        const { data, error } = await supabase
            .from('family_calendar_events')
            .insert({
                household_id: householdId,
                created_by_user_id: access.currentUserId,
                title,
                description,
                start,
                end,
                is_shared
                // här kan du senare lägga till t.ex. external_provider, external_id, recurrence_rule
            })
            .select()
            .single();

        if (error) {
            console.error('create event error', error);
            return fail(400, { message: error.message });
        }

        await supabase
            .from('family_calendar_event_attendees')
            .delete()
            .eq('event_id', data.id);

        if (is_shared && attendees.length) {
            await supabase.from('family_calendar_event_attendees').insert(
                attendees.map((id) => ({
                    event_id: data.id,
                    household_member_id: id
                }))
            );
        } else {
            const me = access.selectableMembers.find(
                (m: any) => m.user_id === access.currentUserId
            );
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

        await supabase
            .from('family_calendar_events')
            .update({
                title,
                description,
                start,
                end,
                is_shared
                // här kan du senare uppdatera external_provider, external_id, recurrence_rule
            })
            .eq('id', event_id)
            .eq('household_id', householdId);

        await supabase
            .from('family_calendar_event_attendees')
            .delete()
            .eq('event_id', event_id);

        if (is_shared && attendees.length) {
            await supabase.from('family_calendar_event_attendees').insert(
                attendees.map((id) => ({
                    event_id,
                    household_member_id: id
                }))
            );
        } else {
            const me = access.selectableMembers.find(
                (m: any) => m.user_id === access.currentUserId
            );
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

        await supabase
            .from('family_calendar_event_attendees')
            .delete()
            .eq('event_id', event_id);

        return { success: true };
    }
};
