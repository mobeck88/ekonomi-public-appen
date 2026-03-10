import { fail, redirect } from '@sveltejs/kit';

export const actions = {
    default: async ({ request, locals }) => {
        const supabase = locals.supabase;

        const form = await request.formData();
        const email = form.get('email');
        const password = form.get('password');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return fail(400, { message: error.message });
        }

        // Nu är sessionen satt via cookies
        throw redirect(303, '/');
    }
};

export const load = async ({ locals }) => {
    if (locals.user) {
        throw redirect(303, '/');
    }
};
