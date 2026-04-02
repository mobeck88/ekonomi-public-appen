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
  if (!householdId) return { events: [], members: [], view: 'week', currentMemberId: null };

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

  const { data: attendees } = await supabase
    .from('family_calendar_event_attendees')
    .select('event_id, household_member_id');

  const { data: members } = await supabase
    .from('household_members')
    .select('id, name, user_id, color')
    .eq('household_id', householdId);

  const memberById = new Map<string, any>();
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

    const attendeeColors = evAtt
      .map((a) => memberById.get(a.household_member_id)?.color)
      .filter(Boolean);

    return {
      ...e,
      attendees: evAtt.map((a) => a.household_member_id),
      attendeeColors,
      color
    };
  });

  const currentMember =
    (members ?? []).find((m: any) => m.user_id === user.id) ?? null;

  return {
    events,
    members: members ?? [],
    view,
    currentMemberId: currentMember ? currentMember.id : null
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const householdId = locals.householdId;
    const user = locals.user;

    const body = await request.json();

    const { data: me } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .maybeSingle();

    const currentMemberId = me?.id ?? null;

    const { data, error } = await supabase
      .from('family_calendar_events')
      .insert({
        household_id: householdId,
        created_by_user_id: user.id,
        title: body.title,
        description: body.description,
        start: body.start,
        end: body.end,
        is_shared: body.is_shared ?? false
      })
      .select()
      .single();

    if (error) {
      console.error('create error', error);
      return { success: false };
    }

    await supabase
      .from('family_calendar_event_attendees')
      .delete()
      .eq('event_id', data.id);

    if (body.is_shared && body.attendees?.length) {
      await supabase.from('family_calendar_event_attendees').insert(
        body.attendees.map((id: string) => ({
          event_id: data.id,
          household_member_id: id
        }))
      );
    } else if (!body.is_shared && currentMemberId) {
      await supabase.from('family_calendar_event_attendees').insert({
        event_id: data.id,
        household_member_id: currentMemberId
      });
    }

    return { success: true };
  },

  update: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const householdId = locals.householdId;
    const user = locals.user;

    const body = await request.json();

    const { data: me } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .maybeSingle();

    const currentMemberId = me?.id ?? null;

    await supabase
      .from('family_calendar_events')
      .update({
        title: body.title,
        description: body.description,
        start: body.start,
        end: body.end,
        is_shared: body.is_shared ?? false
      })
      .eq('id', body.event_id);

    await supabase
      .from('family_calendar_event_attendees')
      .delete()
      .eq('event_id', body.event_id);

    if (body.is_shared && body.attendees?.length) {
      await supabase.from('family_calendar_event_attendees').insert(
        body.attendees.map((id: string) => ({
          event_id: body.event_id,
          household_member_id: id
        }))
      );
    } else if (!body.is_shared && currentMemberId) {
      await supabase.from('family_calendar_event_attendees').insert({
        event_id: body.event_id,
        household_member_id: currentMemberId
      });
    }

    return { success: true };
  },

  delete: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const body = await request.json();

    await supabase
      .from('family_calendar_events')
      .delete()
      .eq('id', body.event_id);

    await supabase
      .from('family_calendar_event_attendees')
      .delete()
      .eq('event_id', body.event_id);

    return { success: true };
  }
};
