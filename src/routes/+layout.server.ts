export const load = ({ locals }) => {
    return {
        user: locals.user,
        householdId: locals.householdId,
        // ⭐ ENDA TILLÄGGET
        enable_assistance: locals.enable_assistance
    };
};
