import { redirect } from '@sveltejs/kit';

export const GET = async ({ cookies }) => {
    // Ta bort ALLA Supabase-relaterade cookies
    for (const cookie of cookies.getAll()) {
        if (cookie.name.startsWith('sb-')) {
            cookies.delete(cookie.name, { path: '/' });
        }
    }

    // Ta bort hushålls-cookie
    cookies.delete('household_id', { path: '/' });

    // Redirect till login
    throw redirect(303, '/login');
};
