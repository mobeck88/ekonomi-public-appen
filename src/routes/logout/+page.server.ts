import { redirect } from '@sveltejs/kit';

export const GET = async ({ cookies }) => {
    // Ta bort Supabase-cookies
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });

    // Skicka tillbaka till login
    throw redirect(303, '/');
};
