import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const publicRoutes = ['/login', '/register'];
    const isPublic = publicRoutes.some((route) =>
        event.url.pathname.startsWith(route)
    );

    // Tillåt POST-actions på /register/next
    const isRegisterNextAction =
        event.url.pathname === '/register/next' &&
        event.request.method === 'POST';

    const isJoinRoute = event.url.pathname.startsWith('/join');
    const isLogoutRoute = event.url.pathname.startsWith('/logout');

    const session = await event.locals.getSession();
    event.locals.user = session?.user ?? null;

    if (!event.locals.user && !isPublic) {
        throw redirect(303, '/login');
    }

    const supabase = event.locals.supabase;
    const user = event.locals.user;

    if (user) {
        const { data: membership } = await supabase
            .from('household_members')
            .select('household_id')
            .eq('user_id', user.id)
            .maybeSingle();

        event.locals.householdId = membership?.household_id ?? null;
    }

    // Viktigt: tillåt POST /register/next?/join och ?/create
    if (
        !event.locals.householdId &&
        !isPublic &&
        !isJoinRoute &&
        !isLogoutRoute &&
        !isRegisterNextAction
    ) {
        throw redirect(303, '/register/next');
    }

    return resolve(event);
};
