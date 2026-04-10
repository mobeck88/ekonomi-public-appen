import { redirect } from "@sveltejs/kit";

export async function load({ locals }) {
    const householdId = locals.householdId;
    const userId = locals.user.id;

    const { data: lists, error } = await locals.supabase
        .from("checklists")
        .select("id, title, assigned_to, created_by, is_recurring, approved_at")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

    if (error) throw error;

    return { checklists: lists, userId };
}

export const actions = {
    create: async ({ request, locals }) => {
        const form = await request.formData();

        const title = form.get("title");

        // Håll det minimalt tills UI för fler fält finns
        const { data, error } = await locals.supabase
            .from("checklists")
            .insert({
                household_id: locals.householdId,
                created_by: locals.user.id,
                title
            })
            .select("id")
            .single();

        if (error) throw error;

        throw redirect(303, `/checklistor/${data.id}`);
    }
};
