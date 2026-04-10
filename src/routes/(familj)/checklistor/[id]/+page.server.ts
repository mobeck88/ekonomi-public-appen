import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
    const id = params.id;
    const supabase = locals.supabase;
    const user = locals.user;

    if (!user) throw redirect(303, "/login");

    const { data: checklist } = await supabase
        .from("checklists")
        .select("*")
        .eq("id", id)
        .single();

    if (!checklist) throw redirect(303, "/checklistor");

    const { data: items } = await supabase
        .from("checklist_items")
        .select("*")
        .eq("checklist_id", id)
        .order("created_at", { ascending: true });

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

        await locals.supabase.from("checklist_items").insert({
            checklist_id,
            text,
            description,
            deadline,
            done: false
        });

        throw redirect(303, `/checklistor/${checklist_id}`);
    },

    toggleItem: async ({ request, locals }) => {
        const form = await request.formData();
        const item_id = form.get("item_id") as string;

        const { data: item } = await locals.supabase
            .from("checklist_items")
            .select("*")
            .eq("id", item_id)
            .single();

        if (!item) return;

        await locals.supabase
            .from("checklist_items")
            .update({ done: !item.done })
            .eq("id", item_id);

        throw redirect(303, `/checklistor/${item.checklist_id}`);
    },

    approve: async ({ request, locals }) => {
        const form = await request.formData();
        const checklist_id = form.get("checklist_id") as string;

        const user = locals.user;

        const { data: checklist } = await locals.supabase
            .from("checklists")
            .select("*")
            .eq("id", checklist_id)
            .single();

        if (!checklist) return;

        const role = checklist.role;
        const createdBy = checklist.created_by;

        const isOwnerOrMember = role === "owner" || role === "member";
        const isCreator = createdBy === user.id;

        if (!isOwnerOrMember && !isCreator) {
            return { error: "Ingen behörighet." };
        }

        await locals.supabase
            .from("checklists")
            .update({ approved: true })
            .eq("id", checklist_id);

        throw redirect(303, `/checklistor/${checklist_id}`);
    }
};
