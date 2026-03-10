export const load = ({ locals }) => {
    return {
        user: locals.user,
        householdId: locals.householdId
    };
};
