import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
    const id = params.id;
    const supabase = locals.supabase;
    const user = locals.user;

    if (!user) throw redirect(303, "/login");

    const { data: checklist, error: e1 } = await supabase
        .from("checklists")
        .select("*")
        .eq("id", id)
        .single();

    if (e1 || !checklist) {
        console.error("load checklist error", e1);
        throw redirect(303, "/checklistor");
    }

    const { data: items, error: e2 } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("checklist_id", id)
        .order("created_at", { ascending: true });

    if (e2) {
        console.error("load checklist_items error", e2);
    }

    return {
        checklist,
        items: items ?? [],
        user
    };
};

export const actions: Actions = {
    addItem: async ({ request, locals }) => {
        const form = await request.formData();
        const checklist_id = form.get("checklist_id") as string;
        const text = form.get("text") as string;
        const description = (form.get("description") as string) || null;
        const deadline = (form.get("deadline") as string) || null;

        if (!checklist_id || !text) {
            return { error: "Ogiltiga fält." };
        }

        const { error } = await locals.supabase
            .from("checklist_items")
            .insert({
                checklist_id,
                text,
                description,
                deadline,
                done: false
            });

        if (error) {
            console.error("add checklist item error", error);
            return { error: error.message };
        }

        throw redirect(303, `/checklistor/${checklist_id}`);
    },

    toggleItem: async ({ request, locals }) => {
        const form = await request.formData();
        const item_id = form.get("item_id") as string;

        if (!item_id) return { error: "Saknar item_id." };

        const { data: item, error: e1 } = await locals.supabase
            .from("checklist_items")
            .select("*")
            .eq("id", item_id)
            .single();

        if (e1 || !item) {
            console.error("fetch checklist item error", e1);
            return { error: "Punkt hittades inte." };
        }

        const { error: e2 } = await locals.supabase
            .from("checklist_items")
            .update({ done: !item.done })
            .eq("id", item_id);

        if (e2) {
            console.error("toggle checklist item error", e2);
            return { error: e2.message };
        }

        throw redirect(303, `/checklistor/${item.checklist_id}`);
    },

    approve: async ({ request, locals }) => {
        const form = await request.formData();
        const checklist_id = form.get("checklist_id") as string;

        const user = locals.user;
        if (!user) return { error: "Ingen användare." };

        // Hämta checklistan
        const { data: checklist, error } = await locals.supabase
            .from("checklists")
            .select("*")
            .eq("id", checklist_id)
            .single();

        if (error || !checklist) {
            console.error("approve load checklist error", error);
            return { error: "Checklistan finns inte." };
        }

        // Hämta användarens roll i hushållet
        const { data: member } = await locals.supabase
            .from("household_members")
            .select("role")
            .eq("household_id", checklist.household_id)
            .eq("user_id", user.id)
            .single();

        const role = member?.role ?? null;

        const allowedRoles = ["owner", "member", "guardian"];
        const isAllowed = allowedRoles.includes(role);
        const isCreator = checklist.created_by === user.id;

        if (!isAllowed && !isCreator) {
            return { error: "Du har inte behörighet att godkänna denna lista." };
        }

        const { error: e2 } = await locals.supabase
            .from("checklists")
            .update({
                approved: true,
                approved_by: user.id,
                approved_at: new Date().toISOString()
            })
            .eq("id", checklist_id);

        if (e2) {
            console.error("approve checklist error", e2);
            return { error: e2.message };
        }

        throw redirect(303, `/checklistor/${checklist_id}`);
    }
};
