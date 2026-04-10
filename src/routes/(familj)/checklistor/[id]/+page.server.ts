import { redirect } from "@sveltejs/kit";

export async function load({ params, locals }) {
    const id = params.id;

    const { data: checklist, error: e1 } = await locals.supabase
        .from("checklists")
        .select("*")
        .eq("id", id)
        .single();

    if (e1) throw e1;

    const { data: items, error: e2 } = await locals.supabase
        .from("checklist_items")
        .select("*")
        .eq("checklist_id", id)
        .order("position", { ascending: true });

    if (e2) throw e2;

    return {
        checklist,
        items: items ?? [],
        userId: locals.user.id
    };
}

export const actions = {
    addItem: async ({ request, locals }) => {
        const form = await request.formData();
        const checklist_id = form.get("checklist_id");
        const text = form.get("text");
        const description = form.get("description");
        const deadline = form.get("deadline") || null;

        if (!text) return { error: "Text saknas." };

        const { error } = await locals.supabase
            .from("checklist_items")
            .insert({
                checklist_id,
                text,
                description,
                deadline,
                done: false
            });

        if (error) return { error: error.message };

        throw redirect(303, "");
    },

    toggleItem: async ({ request, locals }) => {
        const form = await request.formData();
        const item_id = form.get("item_id");

        const { data: item, error: e1 } = await locals.supabase
            .from("checklist_items")
            .select("done")
            .eq("id", item_id)
            .single();

        if (e1) return { error: e1.message };

        const { error: e2 } = await locals.supabase
            .from("checklist_items")
            .update({ done: !item.done })
            .eq("id", item_id);

        if (e2) return { error: e2.message };

        throw redirect(303, "");
    },

    approve: async ({ request, locals }) => {
        const form = await request.formData();
        const checklist_id = form.get("checklist_id");

        const { error } = await locals.supabase
            .from("checklists")
            .update({
                approved_at: new Date(),
                approved_by: locals.user.id
            })
            .eq("id", checklist_id);

        if (error) return { error: error.message };

        throw redirect(303, "");
    }
};
