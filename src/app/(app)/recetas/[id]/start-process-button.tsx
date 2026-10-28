"use client";

import { useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import { secondaryButtonClass } from "@/components/ui";
import { startProcess } from "../../proceso/actions";

export function StartProcessButton({ recipeId, hasSteps, batchId }: { recipeId: number; hasSteps: boolean; batchId?: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  if (!hasSteps) {
    return (
      <>
        <button type="button" disabled aria-describedby="no-steps" className={secondaryButtonClass}>Iniciar proceso</button>
        <p id="no-steps" className="col-span-2 -mt-1 text-xs text-tinta-suave">Esta receta no tiene pasos. Agrégalos en Editar para usar los temporizadores.</p>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await startProcess(recipeId, batchId);
            if (result?.error) setError(result.error);
          })
        }
        className={secondaryButtonClass}
      >
        {pending ? "Iniciando…" : "Iniciar proceso"}
      </button>
      {error ? (
        <div className="col-span-2">
          <FieldError id="start-error" message={error} />
        </div>
      ) : null}
    </>
  );
}
