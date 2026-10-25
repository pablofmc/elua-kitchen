import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static assets, icons, the web manifest, the service worker and the cron
  // tick (it signs in with its own secret, not a session).
  matcher: ["/((?!_next/static|_next/image|brand/|icon|apple-icon|manifest.webmanifest|sw.js|api/process/tick|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
