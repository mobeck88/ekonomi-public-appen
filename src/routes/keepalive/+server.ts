import { json } from '@sveltejs/kit';

export async function GET() {
  // Gör en enkel request mot Supabase REST API
  // Den kommer ge 401, men databasen vaknar och loggar det.
  await fetch('https://stosexhxuaazqgtohopx.supabase.co/rest/v1/any_table');

  return json({ status: 'ok' });
}
