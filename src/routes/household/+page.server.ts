import { fail, redirect } from "@sveltejs/kit";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "$env/static/private";

export const load = async ({ locals, cookies }) => {
    const user = locals.user;
    if (!user) {
        return {
            user: null,
            householdId: null,
            role: null,
            adults: 0,
            children: 0,
            childBirthdates: []
        };
    }

    const access_token = cookies.get("sb-access-token");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        }
    });

    // Hämta hushållsmedlemskap
    const { data: membership } = await supabase
        .from("household_members")
        .select("household_id, role")
        .eq("user_id", user.id)
        .maybeSingle();

    const householdId = membership?.household_id ?? null;

    if (!householdId) {
        return {
            user,
            householdId: null,
            role: null,
            adults: 0,
            children: 0,
            childBirthdates: []
        };
    }

    // Hämta adults/children
    const { data: household } = await supabase
        .from("households")
        .select("adults, children")
        .eq("id", householdId)
        .maybeSingle();

    // Hämta barnens födelsedatum
    const { data: childRows } = await supabase
        .from("household_children")
        .select("id, birthdate")
        .eq("household_id", householdId)
        .order("id");

    return {
        user,
        householdId,
        role: membership.role,
        adults: household?.adults ?? 0,
        children: household?.children ?? 0,
        childBirthdates: childRows ?? []
    };
};

export const actions = {
    // ⭐ DIN GAMLA JOIN-FUNKTION — OFÖRÄNDRAD
    join: async ({ request, locals, cookies }) => {
        const user = locals.user;
        if (!user) return fail(401, { error: "Du måste vara inloggad." });

        const form = await request.formData();
        const code = form.get("code");

        const access_token = cookies.get("sb-access-token");

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            }
        });

        const { data: household } = await supabase
            .from("households")
            .select("id")
            .eq("id", code)
            .maybeSingle();

        if (!household) return fail(404, { error: "Hushåll hittades inte." });

        const { error } = await supabase.from("household_members").insert({
            household_id: household.id,
            user_id: user.id,
            role: "member"
        });

        if (error) return fail(500, { error: "Kunde inte gå med i hushållet." });

        return { success: true };
    },

    // ⭐ NY FUNKTION FÖR ATT SPARA HUSHÅLLSINSTÄLLNINGAR
    saveHousehold: async ({ request, locals, cookies }) => {
        const user = locals.user;
        if (!user) throw redirect(303, "/login");

        const form = await request.formData();

        const adults = Number(form.get("adults"));
        const children = Number(form.get("children"));

        const access_token = cookies.get("sb-access-token");

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: {
                headers: {
                    Authorization: `Bearer ${access_token}`
                }
            }
        });

        // Hämta hushållet
        const { data: membership } = await supabase
            .from("household_members")
            .select("household_id")
            .eq("user_id", user.id)
            .maybeSingle();

        if (!membership) {
            return fail(400, { message: "Du tillhör inget hushåll." });
        }

        const householdId = membership.household_id;

        // Uppdatera adults/children
        const { error: updateError } = await supabase
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
        await supabase
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
            const { error: insertError } = await supabase
                .from("household_children")
                .insert(inserts);

            if (insertError) {
                return fail(500, {
                    message: "Kunde inte spara barnens födelsedatum."
                });
            }
        }

        return { message: "Hushållet uppdaterades." };
    }
};
