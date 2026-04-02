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
            role: "member",
            useCustomRiksnorm: false,
            customRiksnorm: null,
            selectedYear: new Date().getFullYear(),

            // ⭐ NYTT
            showDebts: false
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
        .select("guardian_for, household_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

    const householdId = memberData?.household_id ?? null;

    let enableAssistance = false;
    let useCustomRiksnorm = false;

    // ⭐ NYTT
    let showDebts = false;

    if (householdId) {
        const { data: household } = await locals.supabase
            .from("households")
            .select("enable_assistance, use_custom_riksnorm, show_debts") // ⭐ NYTT
            .eq("id", householdId)
            .maybeSingle();

        enableAssistance = household?.enable_assistance ?? false;
        useCustomRiksnorm = household?.use_custom_riksnorm ?? false;

        // ⭐ NYTT
        showDebts = household?.show_debts ?? false;
    }

    let customRiksnorm = null;

    if (householdId) {
        const { data } = await locals.supabase
            .from("custom_riksnorm")
            .select("*")
            .eq("household_id", householdId)
            .eq("year", year)
            .maybeSingle();

        customRiksnorm = data ?? null;
    }

    return {
        isMemberOfChurch: churchData?.is_member_of_church ?? true,
        hasGuardian: memberData?.guardian_for ?? false,
        enableAssistance,
        householdId,
        role: memberData?.role ?? "member",
        useCustomRiksnorm,
        customRiksnorm,
        selectedYear: year,

        // ⭐ NYTT
        showDebts
    };
};

export const actions: Actions = {
    updateSettings: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, "/login");

        const form = await request.formData();

        const isMember = form.get("isMember") === "on";
        const hasGuardian = form.get("hasGuardian") === "on";
        const enableAssistance = form.get("enableAssistance") === "on";

        const useCustomRiksnorm = form.get("useCustomRiksnorm") === "on";
        const selectedYear = Number(form.get("riksnormYear"));

        const adult = form.get("riksnormAdult");
        const child = form.get("riksnormChild");
        const shared = form.get("riksnormShared");

        // ⭐ NYTT
        const showDebts = form.get("showDebts") === "on";

        const year = new Date().getFullYear();

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

        const { data: memberData, error: memberError } = await locals.supabase
            .from("household_members")
            .select("household_id, role")
            .eq("user_id", user.id)
            .single();

        if (memberError || !memberData) {
            return fail(500, { message: "Kunde inte hitta hushåll." });
        }

        const householdId = memberData.household_id;

        const forbiddenRoles = ["guardian", "child", "youth"];
        const effectiveHasGuardian = forbiddenRoles.includes(memberData.role)
            ? false
            : hasGuardian;

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

        const { error: assistanceError } = await locals.supabase
            .from("households")
            .update({
                enable_assistance: enableAssistance,
                use_custom_riksnorm: useCustomRiksnorm,

                // ⭐ NYTT
                show_debts: showDebts
            })
            .eq("id", householdId);

        if (assistanceError) {
            return fail(500, {
                message: "Kunde inte uppdatera biståndsinställningen: " + assistanceError.message
            });
        }

        if (useCustomRiksnorm) {
            await locals.supabase
                .from("custom_riksnorm")
                .upsert(
                    {
                        household_id: householdId,
                        year: selectedYear,
                        adult: adult ? Number(adult) : null,
                        child: child ? Number(child) : null,
                        shared: shared ? Number(shared) : null
                    },
                    { onConflict: "household_id,year" }
                );
        }

        return {
            message: "Inställningar sparade.",
            isMember,
            hasGuardian: effectiveHasGuardian,
            enableAssistance,
            useCustomRiksnorm,

            // ⭐ NYTT
            showDebts
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
