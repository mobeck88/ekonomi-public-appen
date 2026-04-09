import { sendChecklistReadyEmail } from "$lib/server/mail";

export async function load({ params, locals }) {
    const id = params.id;

    const { data: checklist, error: cErr } = await locals.supabase
        .from("checklists")
        .select("*")
        .eq("id", id)
        .single();

    if (cErr) throw cErr;

    const { data: items, error: iErr } = await locals.supabase
        .from("checklist_items")
        .select("*")
        .eq("checklist_id", id)
        .order("position");

    if (iErr) throw iErr;

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
                deadline: deadline || null
            });

        if (error) throw error;
    },

    toggleItem: async ({ request, locals }) => {
        const form = await request.formData();
        const itemId = form.get("item_id");
        const done = form.get("done") === "true";

        // 1. Uppdatera punkten
        await locals.supabase
            .from("checklist_items")
            .update({
                done,
                done_by: locals.user.id,
                done_at: new Date()
            })
            .eq("id", itemId);

        // 2. Hämta checklistans ID
        const { data: item } = await locals.supabase
            .from("checklist_items")
            .select("checklist_id")
            .eq("id", itemId)
            .single();

        const checklistId = item.checklist_id;

        // 3. Kolla om alla punkter är klara
        const { data: items } = await locals.supabase
            .from("checklist_items")
            .select("done")
            .eq("checklist_id", checklistId);

        const allDone = items.every(i => i.done);

        if (!allDone) return;

        // 4. Hämta checklistans metadata
        const { data: checklist } = await locals.supabase
            .from("checklists")
            .select("title, notify_users")
            .eq("id", checklistId)
            .single();

        // 5. Skicka mail
        const url = `https://ekonomi-public-appen.vercel.app/checklistor/${checklistId}`;

        await sendChecklistReadyEmail(
            checklist.notify_users,
            checklist.title,
            url
        );
    },

    approve: async ({ request, locals }) => {
        const form = await request.formData();
        const id = form.get("checklist_id");

        const { error } = await locals.supabase
            .from("checklists")
            .update({
                approved_by: locals.user.id,
                approved_at: new Date()
            })
            .eq("id", id);

        if (error) throw error;
    }
};
