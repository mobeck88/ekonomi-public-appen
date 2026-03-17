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

        const user = authData.user;

        // SAFE PROFILE CHECK
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        // Om RLS blockerar → vi antar att profil inte finns ännu
        if (profileError) {
            console.warn("Profile lookup blocked by RLS:", profileError.message);
            throw redirect(303, '/register/next');
        }

        // Om ingen profil hittades → gå till register/next
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
