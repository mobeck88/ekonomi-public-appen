import { redirect, fail } from '@sveltejs/kit';
import { getAccessContext } from '$lib/server/access';

export const load = async ({ locals, url }) => {
    const access = await getAccessContext(locals, url);
    if (!access.allowed) throw redirect(303, '/login');

    const supabase = locals.supabase;
    const householdId = locals.householdId;

    // Hämta alla händelser för hushållet
    const { data: eventsRaw } = await supabase
        .from('family_calendar_events')
        .select('*')
        .eq('household_id', householdId)
        .order('start', { ascending: true });

    // Hämta attendees
    const { data: attendees } = await supabase
        .from('family_calendar_event_attendees')
        .select('event_id, household_member_id');

    // Bygg attendees per event
    const attendeesByEvent = new Map();
    (attendees ?? []).forEach((a) => {
        if (!attendeesByEvent.has(a.event_id)) attendeesByEvent.set(a.event_id, []);
        attendeesByEvent.get(a.event_id).push(a.household_member_id);
    });

    // Färger och medlemmar kommer från access.selectableMembers
    const members = access.selectableMembers ?? [];

    const memberColor = new Map();
    members.forEach((m) => {
        if (m.color) memberColor.set(m.id, m.color);
    });

    const SHARED_COLOR = '#8884FF';
    const DEFAULT_COLOR = '#0078ff';

    const events = (eventsRaw ?? []).map((e) => {
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

export const actions = {
    create: async ({ request, locals, url }) => {
        const access = await getAccessContext(locals, url);
        if (!access.allowed) throw redirect(303, '/login');
        if (!access.canEdit) return fail(403, { message: 'Ingen behörighet' });

        const supabase = locals.supabase;
        const householdId = locals.householdId;

        const body = await request.json();

        const { data, error } = await supabase
            .from('family_calendar_events')
            .insert({
                household_id: householdId,
                created_by_user_id: access.currentUserId,
                title: body.title,
                description: body.description,
                start: body.start,
                end: body.end,
                is_shared: body.is_shared ?? false
            })
            .select()
            .single();

        if (error) return fail(400, { message: error.message });

        // Rensa och lägg till attendees
        await supabase
            .from('family_calendar_event_attendees')
            .delete()
            .eq('event_id', data.id);

        if (body.is_shared && body.attendees?.length) {
            await supabase.from('family_calendar_event_attendees').insert(
                body.attendees.map((id) => ({
                    event_id: data.id,
                    household_member_id: id
                }))
            );
        } else {
            // Min händelse → lägg till mig själv
            const me = access.selectableMembers.find(
                (m) => m.user_id === access.currentUserId
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

        const body = await request.json();

        await supabase
            .from('family_calendar_events')
            .update({
                title: body.title,
                description: body.description,
                start: body.start,
                end: body.end,
                is_shared: body.is_shared ?? false
            })
            .eq('id', body.event_id)
            .eq('household_id', householdId);

        await supabase
            .from('family_calendar_event_attendees')
            .delete()
            .eq('event_id', body.event_id);

        if (body.is_shared && body.attendees?.length) {
            await supabase.from('family_calendar_event_attendees').insert(
                body.attendees.map((id) => ({
                    event_id: body.event_id,
                    household_member_id: id
                }))
            );
        } else {
            const me = access.selectableMembers.find(
                (m) => m.user_id === access.currentUserId
            );
            if (me) {
                await supabase.from('family_calendar_event_attendees').insert({
                    event_id: body.event_id,
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

        const body = await request.json();

        await supabase
            .from('family_calendar_events')
            .delete()
            .eq('id', body.event_id)
            .eq('household_id', householdId);

        await supabase
            .from('family_calendar_event_attendees')
            .delete()
            .eq('event_id', body.event_id);

        return { success: true };
    }
};
