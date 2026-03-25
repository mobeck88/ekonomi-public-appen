export const load = async ({ locals }) => {
    const user = locals.user;
    const householdId = locals.householdId;

    return {
        user: locals.user,
        householdId: locals.householdId,
        enable_assistance: locals.enable_assistance
    };
};
