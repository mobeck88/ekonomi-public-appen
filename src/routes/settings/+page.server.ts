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

    // 1. Hämta kyrkotillhörighet
    const { data: churchData } = await locals.supabase
        .from("tax_user_settings")
        .select("is_member_of_church")
        .eq("user_id", user.id)
        .eq("year", year)
        .maybeSingle();

    // 2. Hämta hushåll via user_households (KORREKT TABELL)
    const { data: householdLink } = await locals.supabase
        .from("user_households")
        .select("household_id")
        .eq("user_id", user.id)
        .single();

    const householdId = householdLink?.household_id ?? null;

    // 3. Hämta god man från household_members (den tabellen använder du fortfarande)
    const { data: memberData } = await locals.supabase
        .from("household_members")
        .select("guardian_for")
        .eq("user_id", user.id)
        .maybeSingle();

    // 4. Hämta ekonomiskt bistånd från households
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
        householdId
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

        const year = new Date().getFullYear();

        // 1. Uppdatera kyrkotillhörighet
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

        // 2. Hämta hushåll via user_households (KORREKT TABELL)
        const { data: householdLink, error: linkError } = await locals.supabase
            .from("user_households")
            .select("household_id")
            .eq("user_id", user.id)
            .single();

        if (linkError || !householdLink) {
            return fail(500, { message: "Kunde inte hitta hushåll." });
        }

        const householdId = householdLink.household_id;

        // 3. Uppdatera god man i household_members
        const { error: guardianError } = await locals.supabase
            .from("household_members")
            .update({ guardian_for: hasGuardian })
            .eq("user_id", user.id);

        if (guardianError) {
            return fail(500, {
                message: "Kunde inte uppdatera god man-inställningen: " + guardianError.message
            });
        }

        // 4. Uppdatera ekonomiskt bistånd i households
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
            hasGuardian,
            enableAssistance
        };
    }
};