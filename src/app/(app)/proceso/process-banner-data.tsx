import { loadRuns, serverTime } from "@/lib/process-data";
import { createClient } from "@/lib/supabase/server";
import { ProcessBannerView } from "./process-banner";

/** Loads the running processes for the banner every screen shows. */
export async function ProcessBanner() {
  const supabase = await createClient();
  const runs = await loadRuns(supabase);
  return <ProcessBannerView runs={runs} serverNow={serverTime()} />;
}
