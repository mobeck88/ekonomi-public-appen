import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
    const user = locals.user;
    if (!user) throw redirect(303, "/login");

    // Hämta hushållet användaren tillhör
    const { data: membership, error: membershipError } = await locals.supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (membershipError || !membership) {
        return {
            householdId: null,
            adults: 0,
            children: 0,
            childBirthdates: []
        };
    }

    const householdId = membership.household_id;

    // Hämta hushållets vuxna/barn
    const { data: household } = await locals.supabase
        .from("households")
        .select("adults, children")
        .eq("id", householdId)
        .maybeSingle();

    // Hämta barnens födelsedatum
    const { data: childRows } = await locals.supabase
        .from("household_children")
        .select("id, birthdate")
        .eq("household_id", householdId)
        .order("id");

    return {
        householdId,
        adults: household?.adults ?? 0,
        children: household?.children ?? 0,
        childBirthdates: childRows ?? []
    };
};

export const actions: Actions = {
    saveHousehold: async ({ request, locals }) => {
        const user = locals.user;
        if (!user) throw redirect(303, "/login");

        const form = await request.formData();

        const adults = Number(form.get("adults"));
        const children = Number(form.get("children"));

        // Hämta hushållet
        const { data: membership } = await locals.supabase
            .from("household_members")
            .select("household_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!membership) {
            return fail(400, { message: "Du tillhör inget hushåll." });
        }

        const householdId = membership.household_id;

        // Uppdatera adults/children
        const { error: updateError } = await locals.supabase
            .from("households")
            .update({
                adults,
                children
            })
            .eq("id", householdId);

        if (updateError) {
            return fail(500, { message: "Kunde inte uppdatera hushållet." });
        }

        // Ta bort gamla barn
        await locals.supabase
            .from("household_children")
            .delete()
            .eq("household_id", householdId);

        // Lägg till nya barn
        const inserts = [];
        for (let i = 0; i < children; i++) {
            const birthdate = form.get(`child_${i}_birthdate`);
            if (birthdate) {
                inserts.push({
                    household_id: householdId,
                    birthdate
                });
            }
        }

        if (inserts.length > 0) {
            const { error: insertError } = await locals.supabase
                .from("household_children")
                .insert(inserts);

            if (insertError) {
                return fail(500, { message: "Kunde inte spara barnens födelsedatum." });
            }
        }

        return { message: "Hushållet uppdaterades." };
    }
};
