"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") {
    return (
      <div role="status" className="rounded-2xl bg-white p-6 text-center">
        <p className="font-semibold">Revisa tu correo</p>
        <p className="mt-1 text-sm text-tinta-suave">
          Enviamos un enlace a <span className="font-medium text-tinta">{state.message}</span>. Ábrelo para entrar.
        </p>
      </div>
    );
  }

  const error = state.status === "error" ? state.message : linkError ? "El enlace expiró o ya se usó. Pide uno nuevo." : null;

  return (
    <form action={action} className="space-y-4 rounded-2xl bg-white p-6">
      <label className="block">
        <span className="text-sm font-medium">Correo</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="tu@correo.com"
          className="mt-1 block w-full rounded-lg border border-borde bg-crema-claro px-3 py-3 text-base outline-none focus:border-cafe-oscuro focus:ring-2 focus:ring-cafe-oscuro/20"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-tinta">
          <span className="mr-1 inline-block size-2 rounded-full bg-coral" aria-hidden />
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-cafe-oscuro px-4 py-3 font-semibold text-white hover:bg-tinta disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Enviar enlace de acceso"}
      </button>
    </form>
  );
}
