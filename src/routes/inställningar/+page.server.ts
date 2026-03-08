import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

export const load = async ({ locals }) => {
    const user = locals.user;
    if (!user) return { isMemberOfChurch: true };

    const year = new Date().getFullYear();

    const { data } = await supabase
        .from("tax_user_settings")
        .select("is_member_of_church")
        .eq("user_id", user.id)
        .eq("year", year)
        .maybeSingle();

    return {
        isMemberOfChurch: data?.is_member_of_church ?? true
    };
};

export const actions = {
    updateChurch: async ({ request, locals }) => {
        const user = locals.user;
        const form = await request.formData();
        const isMember = form.get("isMember") === "on";
        const year = new Date().getFullYear();

        await supabase
            .from("tax_user_settings")
            .update({ is_member_of_church: isMember })
            .eq("user_id", user.id)
            .eq("year", year);

        return { message: "Kyrkotillhörighet uppdaterad" };
    },

    changePassword: async ({ request }) => {
        const form = await request.formData();
        const newPassword = form.get("newPassword");

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            return { message: "Fel: " + error.message };
        }

        return { message: "Lösenord uppdaterat" };
    },

    logout: async ({ locals }) => {
        await locals.supabase.auth.signOut();

        // ⭐ Direkt redirect till login
        throw redirect(303, '/login');
    }
};
