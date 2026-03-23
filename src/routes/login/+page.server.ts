import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const actions: Actions = {
    default: async ({ request, locals, cookies }) => {
        const supabase = locals.supabase;

        const form = await request.formData();
        const email = form.get('email') as string | null;
        const password = form.get('password') as string | null;

        const { data: authData, error } = await supabase.auth.signInWithPassword({
            email: email ?? '',
            password: password ?? ''
        });

        if (error) {
            return fail(400, { error: error.message });
        }

        // Sätt cookies manuellt (createClient gör det inte åt oss)
        cookies.set('sb-access-token', authData.session.access_token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true
        });

        cookies.set('sb-refresh-token', authData.session.refresh_token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: true
        });

        const user = authData.user;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) {
            console.warn('Profile lookup blocked by RLS:', profileError.message);
            throw redirect(303, '/register/next');
        }

        if (!profile) {
            throw redirect(303, '/register/next');
        }

        throw redirect(303, '/');
    }
};

export const load: PageServerLoad = async ({ locals }) => {
    if (locals.user) {
        throw redirect(303, '/');
    }

    return {};
};
