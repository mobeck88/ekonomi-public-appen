import { db } from "$lib/server/db";
import { redirect } from "@sveltejs/kit";

export async function load({ locals }) {
    const userId = locals.user.id;

    const { data: lists } = await db
        .from("checklists")
        .select("id, title, assigned_to, created_by, is_recurring, approved_at")
        .eq("household_id", locals.household.id)
        .order("created_at", { ascending: false });

    return { lists, userId };
}

export const actions = {
    create: async ({ request, locals }) => {
        const form = await request.formData();

        const title = form.get("title");
        const assigned_to = form.get("assigned_to");
        const is_recurring = form.get("is_recurring") === "on";
        const notify_users = form.getAll("notify_users");

        const { data, error } = await db
            .from("checklists")
            .insert({
                household_id: locals.household.id,
                created_by: locals.user.id,
                assigned_to,
                title,
                is_recurring,
                notify_users
            })
            .select("id")
            .single();

        if (error) throw error;

        throw redirect(303, `/checklistor/${data.id}`);
    }
};
