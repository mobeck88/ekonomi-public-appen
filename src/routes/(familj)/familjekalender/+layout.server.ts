import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, parent }) => {
    const parentData = await parent();

    const user = parentData.user;
    const householdId = parentData.householdId;

    if (!user) throw redirect(303, '/login');

    return {
        ...parentData, // ⭐ Behåll ALLT från globala layouten
        user,
        householdId
    };
};
