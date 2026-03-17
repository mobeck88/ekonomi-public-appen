import { fail, redirect } from '@sveltejs/kit';

export const actions = {
    default: async ({ request, locals }) => {
        const supabase = locals.supabase;

        const form = await request.formData();
        const email = form.get('email');
        const password = form.get('password');

        const { data: authData, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return fail(400, { message: error.message });
        }

        // Hämta användaren
        const user = authData.user;

        // Kolla om profil finns
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        // Om ingen profil → gå till register/next
        if (!profile) {
            throw redirect(303, '/register/next');
        }

        // Om profil finns → kör som idag
        throw redirect(303, '/');
    }
};

export const load = async ({ locals }) => {
    if (locals.user) {
        throw redirect(303, '/');
    }
};
