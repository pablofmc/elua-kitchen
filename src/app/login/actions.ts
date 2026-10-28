"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** `sends` counts emails sent, so the form can tell a new send from one the user backed out of. */
export type LoginState = { status: "idle" | "sent" | "error"; message?: string; sends: number };
export type CodeState = { error?: string };

export async function sendMagicLink(prev: LoginState, formData: FormData): Promise<LoginState> {
  const sends = prev.sends;
  const email = String(formData.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { status: "error", message: "Escribe un correo válido.", sends };
  }

  const origin = (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/confirm` },
  });

  if (error) {
    return {
      status: "error",
      message:
        error.status === 429
          ? "Ya se enviaron muchos correos en poco tiempo. Espera un rato (hasta una hora) y vuelve a intentar."
          : "No pudimos enviar el correo. Intenta de nuevo.",
      sends,
    };
  }
  return { status: "sent", message: email, sends: sends + 1 };
}

/**
 * Signs in with the code from the email. On iPhone the app added to the home screen keeps its own
 * session apart from Safari, where the email's link opens, so the code is how it signs in.
 */
export async function verifyCode(email: string, _prev: CodeState, formData: FormData): Promise<CodeState> {
  const token = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (token.length < 6) return { error: "Escribe los dígitos del código." };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return { error: error.status === 429 ? "Demasiados intentos. Espera un minuto." : "El código no es correcto o ya venció. Revisa el correo más reciente." };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
