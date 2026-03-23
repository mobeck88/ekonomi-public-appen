export const load = async ({ locals }) => {
    // Ingen användare → ingen householdId
    if (!locals.user) {
        return {
            user: null,
            householdId: null,
            enable_assistance: false
        };
    }

    // Användaren finns men saknar hushåll → returnera utan att ladda något
    if (!locals.householdId) {
        return {
            user: locals.user,
            householdId: null,
            enable_assistance: false
        };
    }

    // Användaren har hushåll → returnera värdena
    return {
        user: locals.user,
        householdId: locals.householdId,
        enable_assistance: false
    };
};
