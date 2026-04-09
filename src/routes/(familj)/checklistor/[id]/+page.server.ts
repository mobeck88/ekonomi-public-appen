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
        items,
        userId: locals.user.id
    };
}

export const actions = {
    addItem: async ({ request, locals }) => {
        const form = await request.formData();
        const checklist_id = form.get("checklist_id");
        const text = form.get("text");
        const description = form.get("description");
        const deadline = form.get("deadline");

        const { error } = await locals.supabase
            .from("checklist_items")
            .insert({
                checklist_id,
                text,
                description,
                deadline,
                done: false
            });

        if (error) throw error;

        throw redirect(303, "");
    },

    toggleItem: async ({ request, locals }) => {
        const form = await request.formData();
        const item_id = form.get("item_id");

        const { data: item, error: e1 } = await locals.supabase
            .from("checklist_items")
            .select("checklist_id, done")
            .eq("id", item_id)
            .single();

        if (e1) throw e1;

        await locals.supabase
            .from("checklist_items")
            .update({ done: !item.done })
            .eq("id", item_id);

        // Kolla om alla punkter är klara
        const { data: allItems, error: e2 } = await locals.supabase
            .from("checklist_items")
            .select("done")
            .eq("checklist_id", item.checklist_id);

        if (e2) throw e2;

        const allDone = allItems.length > 0 && allItems.every((i) => i.done);

        if (allDone) {
            // Här kan du koppla in mail‑logik (notify_users) via t.ex. RPC eller annan tjänst
        }

        throw redirect(303, "");
    },

    approve: async ({ request, locals }) => {
        const form = await request.formData();
        const checklist_id = form.get("checklist_id");

        // Hämta checklistan
        const { data: checklist, error: e1 } = await locals.supabase
            .from("checklists")
            .select("*")
            .eq("id", checklist_id)
            .single();

        if (e1) throw e1;

        // Sätt godkänd
        const { error: e2 } = await locals.supabase
            .from("checklists")
            .update({
                approved_at: new Date(),
                approved_by: locals.user.id
            })
            .eq("id", checklist_id);

        if (e2) throw e2;

        // Om återkommande: skapa ny checklista + kopiera punkter
        if (checklist.is_recurring) {
            const { data: newChecklist, error: e3 } = await locals.supabase
                .from("checklists")
                .insert({
                    household_id: checklist.household_id,
                    created_by: checklist.created_by,
                    assigned_to: checklist.assigned_to,
                    title: checklist.title,
                    is_recurring: checklist.is_recurring,
                    notify_users: checklist.notify_users
                })
                .select("id")
                .single();

            if (e3) throw e3;

            const { data: oldItems, error: e4 } = await locals.supabase
                .from("checklist_items")
                .select("text, description, deadline, position")
                .eq("checklist_id", checklist_id);

            if (e4) throw e4;

            if (oldItems.length > 0) {
                const newItems = oldItems.map((i) => ({
                    checklist_id: newChecklist.id,
                    text: i.text,
                    description: i.description,
                    deadline: i.deadline,
                    position: i.position,
                    done: false
                }));

                const { error: e5 } = await locals.supabase
                    .from("checklist_items")
                    .insert(newItems);

                if (e5) throw e5;
            }
        }

        throw redirect(303, "");
    }
};
