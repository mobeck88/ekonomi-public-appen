import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, "/login");
    if (!householdId) return { checklists: [], userId: null, members: [] };

    // Hämta medlemmar (för tilldelning)
    const { data: members } = await supabase
        .from("household_members")
        .select("user_id, profiles(full_name)")
        .eq("household_id", householdId);

    const { data: lists, error } = await supabase
        .from("checklists")
        .select("id, title, assigned_to, created_by, is_recurring, approved_at, notify_users")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

    return {
        checklists: lists ?? [],
        userId: user.id,
        members: members ?? []
    };
};

export const actions: Actions = {
    create: async ({ request, locals }) => {
        const user = locals.user;
        const householdId = locals.householdId;
        const supabase = locals.supabase;

        if (!user) throw redirect(303, "/login");
        if (!householdId) return { error: "Inget hushåll kopplat." };

        const form = await request.formData();
        const title = form.get("title");
        const assigned_to = form.get("assigned_to");

        if (!title) return { error: "Titel saknas." };
        if (!assigned_to) return { error: "assigned_to saknas." };

        const { data, error } = await supabase
            .from("checklists")
            .insert({
                household_id: householdId,
                created_by: user.id,
                assigned_to,
                title,
                is_recurring: false,
                notify_users: []
            })
            .select("id")
            .single();

        if (error) {
            console.error("create checklist error", error);
            return { error: error.message };
        }

        throw redirect(303, `/checklistor/${data.id}`);
    }
};
