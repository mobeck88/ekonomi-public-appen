// Minimal keep-alive function for Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js";

export const handler = async () => {
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Minimal query to keep project awake
  await client.from("households").select("id").limit(1);

  return new Response("ok");
};
