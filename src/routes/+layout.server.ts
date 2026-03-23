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

    // 1. Hämta hushåll via user_households
    //    FIX: .single() → .maybeSingle()
    const { data: householdLink } = await supabase
        .from("user_households")
        .select("household_id")
        .eq("user_id", user.id)
        .maybeSingle();

    const householdId = householdLink?.household_id ?? null;

    // 2. Hämta enable_assistance från households
    let enable_assistance = false;

    if (householdId) {
        const { data } = await supabase
            .from("households")
            .select("enable_assistance")
            .eq("id", householdId)
            .maybeSingle();

        enable_assistance = data?.enable_assistance ?? false;
    }

    return {
        user,
        householdId,
        enable_assistance
    };
};
