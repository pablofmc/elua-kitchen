import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Bypasses RLS with the secret key. Only for server jobs that act for the whole kitchen with no
 * signed-in person behind them (the process tick). Never import it from a page or action.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
