export const actions: Actions = {
  create: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const householdId = locals.householdId;
    const user = locals.user;

    const body = await request.json();

    const { data, error } = await supabase
      .from('family_calendar_events')
      .insert({
        household_id: householdId,
        created_by_user_id: user.id,
        title: body.title,
        description: body.description,
        start: body.start,
        end: body.end
      })
      .select()
      .single();

    if (!error && body.attendees?.length) {
      await supabase.from('family_calendar_event_attendees').insert(
        body.attendees.map((id: string) => ({
          event_id: data.id,
          household_member_id: id
        }))
      );
    }

    return { success: true };
  },

  update: async ({ request, locals }) => {
    const supabase = locals.supabase;
    const body = await request.json();

    await supabase
      .from('family_calendar_events')
      .update({
        title: body.title,
        description: body.description,
        start: body.start,
        end: body.end
      })
      .eq('id', body.event_id);

    await supabase
      .from('family_calendar_event_attendees')
      .delete()
      .eq('event_id', body.event_id);

    if (body.attendees?.length) {
      await supabase.from('family_calendar_event_attendees').insert(
        body.attendees.map((id: string) => ({
          event_id: body.event_id,
          household_member_id: id
        }))
      );
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

    return { success: true };
  }
};
