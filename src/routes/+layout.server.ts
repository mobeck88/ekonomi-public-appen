import { redirect } from '@sveltejs/kit';

export const load = ({ locals, url }) => {
    const publicRoutes = ['/login', '/register'];

    if (!locals.user && !publicRoutes.includes(url.pathname)) {
        throw redirect(303, '/login');
    }

    return {
        user: locals.user,
        householdId: locals.householdId
    };
};
