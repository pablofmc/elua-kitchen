import { loadRuns, serverTime } from "@/lib/process-data";
import { createClient } from "@/lib/supabase/server";
import { ProcessBannerView } from "./process-banner";

/** Loads the running processes for the banner every screen shows. */
export async function ProcessBanner() {
  const supabase = await createClient();
  // The banner is a nice-to-have on every screen: if processes can't load, skip it rather than
  // take the whole screen down with it.
  const runs = await loadRuns(supabase).catch((error: unknown) => {
    console.error("process banner: could not load processes", error);
    return null;
  });
  if (!runs) return null;
  return <ProcessBannerView runs={runs} serverNow={serverTime()} />;
}
