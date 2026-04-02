import { redirect } from '@sveltejs/kit';

export const GET = async ({ locals }) => {
    const supabase = locals.supabase;

    // Logga ut från Supabase (tar bort cookies)
    await supabase.auth.signOut();

    throw redirect(303, '/login');
};
