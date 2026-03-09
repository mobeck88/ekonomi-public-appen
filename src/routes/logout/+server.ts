import { redirect } from '@sveltejs/kit';

export const GET = async ({ cookies }) => {
    // Ta bort Supabase-session
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    // Ta bort hushålls-cookie
    cookies.delete('household_id', { path: '/' });

    // Skicka tillbaka till login
    throw redirect(303, '/login');
};
