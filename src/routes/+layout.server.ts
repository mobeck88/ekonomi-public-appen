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

    // HÄR ÄR FIXEN: använd household_members, inte user_households
    const { data: membership } = await supabase
        .from("household_members")
        .select("household_id")
        .eq("user_id", user.id)
        .maybeSingle();

    const householdId = membership?.household_id ?? null;

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
