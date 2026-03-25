import { json } from '@sveltejs/kit';
import { SUPABASE_ANON_KEY } from '$env/static/private';

export async function GET() {
    // Gör en request som Supabase ALLTID loggar
    await fetch('https://stosexhxuaazqgtohopx.supabase.co/rest/v1/any_table', {
        method: 'GET',
        headers: {
            apikey: SUPABASE_ANON_KEY,
            // Gör så att Supabase svarar 401 istället för 404
            Authorization: 'Bearer invalid'
        }
    });

    return json({ status: 'ok' });
}
