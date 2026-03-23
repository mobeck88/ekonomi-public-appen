export const load = async ({ locals }) => {
    const user = locals.user;
    const supabase = locals.supabase;

    if (!user) {
        return {
            user: null,
            householdId: null,
            enable_assistance: false
        };
    }

    // 1. Hämta hushåll via user_households (robust)
    const { data: householdLink, error: householdError } = await supabase
        .from("user_households")
        .select("household_id")
        .eq("user_id", user.id)
        .maybeSingle(); // <-- viktigt: kraschar inte om tabellen är tom

    const householdId = householdLink?.household_id ?? null;

    // 2. Hämta enable_assistance från households (robust)
    let enable_assistance = false;

    if (householdId) {
        const { data, error } = await supabase
            .from("households")
            .select("enable_assistance")
            .eq("id", householdId)
            .maybeSingle(); // <-- samma här

        enable_assistance = data?.enable_assistance ?? false;
    }

    return {
        user,
        householdId,
        enable_assistance
    };
};
