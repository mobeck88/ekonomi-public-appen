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

    const { data: member } = await supabase
        .from("household_members")
        .select("role")
        .eq("household_id", checklist.household_id)
        .eq("user_id", user.id)
        .single();

    return {
        checklist,
        items: items ?? [],
        user,
        role: member?.role ?? null
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

        await locals.supabase
            .from("checklists")
            .update({
                approved: true,
                approved_by: user.id,
                approved_at: new Date().toISOString().split(".")[0] // ← FIXAR PGRST204
            })
            .eq("id", checklist_id);

        throw redirect(303, `/checklistor/${checklist_id}`);
    }
};
