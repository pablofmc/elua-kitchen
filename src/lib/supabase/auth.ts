import { createClient } from "./server";

/**
 * Server client for a Server Action, after checking there is a real session.
 * RLS enforces the same rule; this turns a direct POST without a session into a clear error.
 */
export async function createActionClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims || data.claims.is_anonymous) {
    throw new Error("Inicia sesión para continuar.");
  }
  return supabase;
}
