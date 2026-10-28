"use client";

import { useActionState, useState } from "react";
import { sendMagicLink, verifyCode, type CodeState, type LoginState } from "./actions";

const initial: LoginState = { status: "idle", sends: 0 };

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);
  // The send «Usar otro correo» backed out of; a newer send shows the code form again.
  const [dismissed, setDismissed] = useState(0);

  if (state.status === "sent" && state.sends > dismissed) {
    return <CodeForm key={state.sends} email={state.message!} onRestart={() => setDismissed(state.sends)} />;
  }

  const error = state.status === "error" ? state.message : linkError ? "El enlace expiró o ya se usó. Pide uno nuevo." : null;
  return <EmailForm action={action} pending={pending} error={error ?? null} />;
}

function EmailForm({ action, pending, error }: { action: (formData: FormData) => void; pending: boolean; error: string | null }) {
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
        {pending ? "Enviando…" : "Enviarme un código"}
      </button>
    </form>
  );
}

const codeIdle: CodeState = {};

function CodeForm({ email, onRestart }: { email: string; onRestart: () => void }) {
  const [state, action, pending] = useActionState(verifyCode.bind(null, email), codeIdle);
  return (
    <form action={action} className="space-y-4 rounded-2xl bg-white p-6">
      <div role="status">
        <p className="font-semibold">Revisa tu correo</p>
        <p className="mt-1 text-sm text-tinta-suave">
          Enviamos un código a <span className="font-medium text-tinta">{email}</span>. Escríbelo aquí. En la computadora también puedes
          tocar el botón del correo.
        </p>
      </div>
      <label className="block">
        <span className="text-sm font-medium">Código</span>
        <input
          name="code"
          required
          autoFocus
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern="[0-9 ]*"
          maxLength={10}
          placeholder="123456"
          className="mt-1 block w-full rounded-lg border border-borde bg-crema-claro px-3 py-3 text-center text-2xl font-bold tracking-[0.3em] tabular-nums outline-none focus:border-cafe-oscuro focus:ring-2 focus:ring-cafe-oscuro/20"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-tinta">
          <span className="mr-1 inline-block size-2 rounded-full bg-coral" aria-hidden />
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-cafe-oscuro px-4 py-3 font-semibold text-white hover:bg-tinta disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <button type="button" onClick={onRestart} className="min-h-11 w-full text-sm font-semibold text-cafe-oscuro underline">
        Usar otro correo
      </button>
    </form>
  );
}
