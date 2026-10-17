import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing page for the magic link. Handles both link styles:
 * - token_hash + type: works on any device (needs the custom email template)
 * - code: Supabase's default template; only works in the browser that asked for the link
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  let failed = true;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    failed = Boolean(error);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failed = Boolean(error);
  }

  return NextResponse.redirect(new URL(failed ? "/login?error=enlace" : "/", origin));
}
