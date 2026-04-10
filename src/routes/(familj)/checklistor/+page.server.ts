import { redirect } from "@sveltejs/kit";

export async function load({ locals }) {
    const householdId = locals.householdId;
    const userId = locals.user.id;

    const { data: lists, error } = await locals.supabase
        .from("checklists")
        .select("id, title, created_by, approved_at, is_recurring")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

    if (error) throw error;

    return { checklists: lists ?? [], userId };
}

export const actions = {
    create: async ({ request, locals }) => {
        const form = await request.formData();
        const title = form.get("title");

        if (!title) return { error: "Titel saknas." };

        const { data, error } = await locals.supabase
            .from("checklists")
            .insert({
                household_id: locals.householdId,
                created_by: locals.user.id,
                title
            })
            .select("id")
            .single();

        if (error) return { error: error.message };

        throw redirect(303, `/checklistor/${data.id}`);
    }
};
