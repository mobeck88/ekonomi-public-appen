import { redirect } from '@sveltejs/kit';

export const GET = async ({ cookies }) => {
    cookies.delete('sb-access-token', { path: '/' });
    cookies.delete('sb-refresh-token', { path: '/' });
    cookies.delete('household_id', { path: '/' });

    throw redirect(303, '/login');
};
