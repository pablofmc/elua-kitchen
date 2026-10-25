"use server";

import { createActionClient } from "@/lib/supabase/auth";

type Subscription = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Saves this device so it gets process notices. Re-saving the same device updates its keys. */
export async function saveDevice(subscription: Subscription): Promise<{ ok: boolean }> {
  const { endpoint, keys } = subscription ?? {};
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || typeof keys?.p256dh !== "string" || typeof keys?.auth !== "string") {
    return { ok: false };
  }
  const supabase = await createActionClient();
  const { error } = await supabase.from("push_subscriptions").upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: "endpoint" });
  return { ok: !error };
}

export async function removeDevice(endpoint: string): Promise<void> {
  const supabase = await createActionClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
