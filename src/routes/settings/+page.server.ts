import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) {
        return {
            isMemberOfChurch: true
        };
    }

    const year = new Date().getFullYear();

    const { data, error } = await locals.supabase
        .from("tax_user_settings")
        .select("is_member_of_church")
        .eq("user_id", user.id)
        .eq("year", year)
        .maybeSingle();

    if (error) {
        console.error("load tax_user_settings error:", error);
    }

    return {
        isMemberOfChurch: data?.is_member_of_church ?? true
    };
};

export const actions: Actions = {
    updateChurch: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, "/login");

        const form = await request.formData();
        const isMember = form.get("isMember") === "on";
        const year = new Date().getFullYear();

        const { error } = await locals.supabase
            .from("tax_user_settings")
            .upsert(
                {
                    user_id: user.id,
                    year,
                    is_member_of_church: isMember
                },
                {
                    onConflict: "user_id,year"
                }
            );

        if (error) {
            console.error("updateChurch error:", error);
            return fail(500, {
                message: "Kunde inte uppdatera kyrkotillhörighet: " + error.message,
                isMember
            });
        }

        return {
            message: "Kyrkotillhörighet uppdaterad.",
            isMember
        };
    },

    changePassword: async ({ request, locals }) => {
        const form = await request.formData();
        const newPassword = form.get("newPassword");

        const { error } = await locals.supabase.auth.updateUser({
            password: newPassword as string
        });

        if (error) {
            console.error("changePassword error:", error);
            return fail(500, { message: "Fel: " + error.message });
        }

        return { message: "Lösenord uppdaterat" };
    }
};
