export const load = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    let showDebts = false;

    if (householdId) {
        const { data } = await locals.supabase
            .from("households")
            .select("show_debts")
            .eq("id", householdId)
            .maybeSingle();

        showDebts = data?.show_debts ?? false;
    }

    return {
        user,
        householdId,
        enable_assistance: locals.enable_assistance,

        // ⭐ NYTT
        showDebts
    };
};
