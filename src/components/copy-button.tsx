"use client";

import { useEffect, useState } from "react";
import { FieldError } from "@/components/field-error";
import { secondaryButtonClass } from "@/components/ui";

/** Copies plain text (a calculation as a list) and says so for two seconds. */
export function CopyButton({ text }: { text: () => string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status !== "copied") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text());
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className="contents">
      <button type="button" onClick={copy} className={secondaryButtonClass}>
        <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          {status === "copied" ? <path d="m5 12 5 5L20 7" /> : <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>}
        </svg>
        <span aria-live="polite">{status === "copied" ? "Copiado" : "Copiar lista"}</span>
      </button>
      {status === "failed" ? (
        <div className="col-span-2 order-last">
          <FieldError id="copy-error" message="No se pudo copiar. Mantén presionada la lista para seleccionarla y copiarla." />
        </div>
      ) : null}
    </div>
  );
}
