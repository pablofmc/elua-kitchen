"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { status: "idle" | "sent" | "error"; message?: string };

export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { status: "error", message: "Escribe un correo válido." };
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
      message: error.status === 429 ? "Espera un minuto antes de pedir otro enlace." : "No pudimos enviar el enlace. Intenta de nuevo.",
    };
  }
  return { status: "sent", message: email };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
