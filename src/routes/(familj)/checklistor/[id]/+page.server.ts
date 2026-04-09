import { db } from "$lib/server/db";
import { sendChecklistReadyEmail } from "$lib/server/mail";

export async function load({ params, locals }) {
    const id = params.id;

    const { data: checklist } = await db
        .from("checklists")
        .select("*")
        .eq("id", id)
        .single();

    const { data: items } = await db
        .from("checklist_items")
        .select("*")
        .eq("checklist_id", id)
        .order("position");

    return {
        checklist,
        items,
        userId: locals.user.id,
        role: locals.role
    };
}

export const actions = {
    addItem: async ({ request }) => {
        const form = await request.formData();
        const checklist_id = form.get("checklist_id");
        const text = form.get("text");
        const description = form.get("description");
        const deadline = form.get("deadline");

        await db.from("checklist_items").insert({
            checklist_id,
            text,
            description,
            deadline: deadline || null
        });
    },

    toggle: async ({ request, locals }) => {
        const form = await request.formData();
        const id = form.get("item_id");
        const done = form.get("done") === "true";

        await db
            .from("checklist_items")
            .update({
                done,
                done_by: locals.user.id,
                done_at: new Date()
            })
            .eq("id", id);

        // Kontrollera om alla är klara
        const { data: item } = await db
            .from("checklist_items")
            .select("checklist_id")
            .eq("id", id)
            .single();

        const checklist_id = item.checklist_id;

        const { data: items } = await db
            .from("checklist_items")
            .select("done")
            .eq("checklist_id", checklist_id);

        const allDone = items.every(i => i.done);

        if (!allDone) return;

        const { data: checklist } = await db
            .from("checklists")
            .select("title, notify_users")
            .eq("id", checklist_id)
            .single();

        const url = `https://ekonomi-public-appen.vercel.app/checklistor/${checklist_id}`;

        await sendChecklistReadyEmail(
            checklist.notify_users,
            checklist.title,
            url
        );
    },

    approve: async ({ request, locals }) => {
        const form = await request.formData();
        const id = form.get("checklist_id");

        await db
            .from("checklists")
            .update({
                approved_by: locals.user.id,
                approved_at: new Date()
            })
            .eq("id", id);
    }
};
