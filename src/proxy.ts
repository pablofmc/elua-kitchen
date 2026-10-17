import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Everything except static assets, icons and the web manifest.
  matcher: ["/((?!_next/static|_next/image|brand/|icon|apple-icon|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
