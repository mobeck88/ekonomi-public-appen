import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
    const id = params.id;
    const supabase = locals.supabase;
    const user = locals.user;

    if (!user) throw redirect(303, "/login");

    // Hämta checklista
    const { data: checklist, error: e1 } = await supabase
        .from("checklists")
        .select("*")
        .eq("id", id)
        .single();

    if (e1 || !checklist) {
        console.error("load checklist error", e1);
        throw redirect(303, "/checklistor");
    }

    // Hämta punkter
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
        userId: user.id
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

        // Gå alltid tillbaka till ren URL utan ?/addItem
        throw redirect(303, `/checklistor/${checklist_id}`);
    },

    toggleItem: async ({ request, locals }) => {
        const form = await request.formData();
        const item_id = form.get("item_id") as string;

        if (!item_id) return { error: "Saknar item_id." };

        const { data: item, error: e1 } = await locals.supabase
            .from("checklist_items")
            .select("id, checklist_id, done")
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

        // Tillbaka till ren checklist‑URL, utan ?/toggleItem
        throw redirect(303, `/checklistor/${item.checklist_id}`);
    }
};
