import { json } from '@sveltejs/kit';
import { SUPABASE_ANON_KEY } from '$env/static/private';

export async function GET() {
    await fetch('https://stosexhxuaazqgtohopx.supabase.co/rest/v1/any_table', {
        method: 'GET',
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: 'Bearer invalid'
        }
    });

    return json({ status: 'ok' });
}
