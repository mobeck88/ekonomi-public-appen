import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) {
        return {
            isMemberOfChurch: true,
            hasGuardian: false,
            enableAssistance: false,
            householdId: null,
            role: "member" // <-- tillagt fallback
        };
    }

    const year = new Date().getFullYear();

    // Kyrkotillhörighet
    const { data: churchData } = await locals.supabase
        .from("tax_user_settings")
        .select("is_member_of_church")
        .eq("user_id", user.id)
        .eq("year", year)
        .maybeSingle();

    // Hämta guardian + household_id + role  <-- UPPDATERAT
    const { data: memberData } = await locals.supabase
        .from("household_members")
        .select("guardian_for, household_id, role") // <-- role tillagd
        .eq("user_id", user.id)
        .maybeSingle();

    const householdId = memberData?.household_id ?? null;

    // Hämta ekonomiskt bistånd
    let enableAssistance = false;

    if (householdId) {
        const { data: household } = await locals.supabase
            .from("households")
            .select("enable_assistance")
            .eq("id", householdId)
            .maybeSingle();

        enableAssistance = household?.enable_assistance ?? false;
    }

    return {
        isMemberOfChurch: churchData?.is_member_of_church ?? true,
        hasGuardian: memberData?.guardian_for ?? false,
        enableAssistance,
        householdId,
        role: memberData?.role ?? "member" // <-- skickas upp till Svelte
    };
};

export const actions: Actions = {
    // SAMMANSLAGEN ACTION FÖR TRE INSTÄLLNINGAR
    updateSettings: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, "/login");

        const form = await request.formData();

        const isMember = form.get("isMember") === "on";
        const hasGuardian = form.get("hasGuardian") === "on";
        const enableAssistance = form.get("enableAssistance") === "on";

        const year = new Date().getFullYear();

        // 1. Kyrkotillhörighet
        const { error: churchError } = await locals.supabase
            .from("tax_user_settings")
            .upsert(
                {
                    user_id: user.id,
                    year,
                    is_member_of_church: isMember
                },
                { onConflict: "user_id,year" }
            );

        if (churchError) {
            return fail(500, {
                message: "Kunde inte uppdatera kyrkotillhörighet: " + churchError.message
            });
        }

        // 2. Hämta household_id + role  <-- UPPDATERAT
        const { data: memberData, error: memberError } = await locals.supabase
            .from("household_members")
            .select("household_id, role") // <-- role tillagd
            .eq("user_id", user.id)
            .maybeSingle();

        if (memberError || !memberData) {
            return fail(500, { message: "Kunde inte hitta hushållsmedlemskap." });
        }

        const householdId = memberData.household_id;

        // Roller som INTE får välja "Jag har en god man"
        const forbiddenRoles = ["guardian", "child", "youth"];

        // Om rollen är förbjuden → ignorera checkboxen
        const effectiveHasGuardian = forbiddenRoles.includes(memberData.role)
            ? false
            : hasGuardian;

        // 3. God man
        const { error: guardianError } = await locals.supabase
            .from("household_members")
            .update({ guardian_for: effectiveHasGuardian })
            .eq("user_id", user.id)
            .eq("household_id", householdId);

        if (guardianError) {
            return fail(500, {
                message: "Kunde inte uppdatera god man-inställningen: " + guardianError.message
            });
        }

        // 4. Ekonomiskt bistånd
        const { error: assistanceError } = await locals.supabase
            .from("households")
            .update({ enable_assistance: enableAssistance })
            .eq("id", householdId);

        if (assistanceError) {
            return fail(500, {
                message: "Kunde inte uppdatera biståndsinställningen: " + assistanceError.message
            });
        }

        return {
            message: "Inställningar sparade.",
            isMember,
            hasGuardian: effectiveHasGuardian,
            enableAssistance
        };
    },

    // LÖSENORD – lämnas orörd
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
