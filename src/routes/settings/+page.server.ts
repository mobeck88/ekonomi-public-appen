import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) {
        return {
            isMemberOfChurch: true,
            hasGuardian: false,
            enableAssistance: false,
            householdId: null
        };
    }

    const year = new Date().getFullYear();

    const { data: churchData } = await locals.supabase
        .from("tax_user_settings")
        .select("is_member_of_church")
        .eq("user_id", user.id)
        .eq("year", year)
        .maybeSingle();

    const { data: memberData } = await locals.supabase
        .from("household_members")
        .select("guardian_for, household_id")
        .eq("user_id", user.id)
        .maybeSingle();

    let enableAssistance = false;

    if (memberData?.household_id) {
        const { data: household } = await locals.supabase
            .from("households")
            .select("enable_assistance")
            .eq("id", memberData.household_id)
            .maybeSingle();

        enableAssistance = household?.enable_assistance ?? false;
    }

    return {
        isMemberOfChurch: churchData?.is_member_of_church ?? true,
        hasGuardian: memberData?.guardian_for ?? false,
        enableAssistance,
        householdId: memberData?.household_id ?? null
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
            return fail(500, {
                message: "Kunde inte uppdatera kyrkotillhörighet: " + error.message,
                isMember
            });
        }

        return { message: "Kyrkotillhörighet uppdaterad.", isMember };
    },

    updateGuardianStatus: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, "/login");

        const form = await request.formData();
        const hasGuardian = form.get("hasGuardian") === "on";

        const { data: memberData } = await locals.supabase
            .from("household_members")
            .select("household_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberData) {
            return fail(500, { message: "Kunde inte hitta hushållsmedlemskap." });
        }

        const householdId = memberData.household_id;

        const { error } = await locals.supabase
            .from("household_members")
            .update({
                guardian_for: hasGuardian
            })
            .eq("user_id", user.id)
            .eq("household_id", householdId);

        if (error) {
            return fail(500, {
                message: "Kunde inte uppdatera inställningen.",
                hasGuardian
            });
        }

        return {
            message: "Inställningen sparad.",
            hasGuardian
        };
    },

    updateAssistance: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, "/login");

        const form = await request.formData();
        const enabled = form.get("enableAssistance") === "on";

        const { data: memberData } = await locals.supabase
            .from("household_members")
            .select("household_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!memberData) {
            return fail(500, { message: "Kunde inte hitta hushåll." });
        }

        const householdId = memberData.household_id;

        const { error } = await locals.supabase
            .from("households")
            .update({ enable_assistance: enabled })
            .eq("id", householdId);

        if (error) {
            return fail(500, {
                message: "Kunde inte uppdatera inställningen.",
                enabled
            });
        }

        return {
            message: "Inställningen sparad.",
            enableAssistance: enabled
        };
    },

    changePassword: async ({ request, locals }) => {
        const form = await request.formData();
        const newPassword = form.get("newPassword");

        const { error } = await locals.supabase.auth.updateUser({
            password: newPassword as string
        });

        if (error) {
            return fail(500, { message: "Fel: " + error.message });
        }

        return { message: "Lösenord uppdaterat" };
    }
};
