export const load = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;
    const supabase = locals.supabase;

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
