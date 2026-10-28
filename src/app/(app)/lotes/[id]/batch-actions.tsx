"use client";

import { useState, useTransition } from "react";
import { CopyButton } from "@/components/copy-button";
import { FieldError } from "@/components/field-error";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { deleteBatch } from "../actions";

export function BatchActions({ id, status, copyText }: { id: number; status: "planeado" | "horneado"; copyText: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <CopyButton text={() => copyText} />
      </div>
      {status === "planeado" ? (
        confirming ? (
          <div className="space-y-3 rounded-2xl border border-borde bg-white p-4" role="alertdialog" aria-labelledby="delete-title">
            <p id="delete-title" className="font-semibold">¿Eliminar este lote? No se puede deshacer.</p>
            <FieldError id="delete-error" message={error} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirming(false)} className={secondaryButtonClass}>
                No
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const result = await deleteBatch(id);
                    if (result?.error) setError(result.error);
                  })
                }
                className={primaryButtonClass}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className="min-h-11 text-sm font-semibold text-tinta-suave underline">
            Eliminar lote
          </button>
        )
      ) : null}
    </div>
  );
}
