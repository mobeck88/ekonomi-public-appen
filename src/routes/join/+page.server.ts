import type { Actions } from './$types';

export const actions: Actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        const code = data.get('code');

        console.log("JOIN ACTION KÖRS, code:", code);

        if (!code) {
            return { error: "Ingen kod angiven" };
        }

        return { success: true };
    }
};
