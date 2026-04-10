import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

    if (!user) throw redirect(303, "/login");
    if (!householdId) return { checklists: [], userId: null };

    const { data: lists, error } = await supabase
        .from("checklists")
        .select("id, title, assigned_to, created_by, is_recurring, approved_at, notify_users")
        .eq("household_id", householdId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("load checklists error", error);
        return { checklists: [], userId: user.id };
    }

    return {
        checklists: lists ?? [],
        userId: user.id
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

        if (!title) {
            return { error: "Titel saknas." };
        }

        // Sätt alla fält som typiskt kan vara NOT NULL
        const assigned_to = null;          // t.ex. uuid, nullable
        const is_recurring = false;        // t.ex. boolean NOT NULL
        const notify_users: string[] = []; // t.ex. text[] NOT NULL

        const { data, error } = await supabase
            .from("checklists")
            .insert({
                household_id: householdId,
                created_by: user.id,
                title,
                assigned_to,
                is_recurring,
                notify_users
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
