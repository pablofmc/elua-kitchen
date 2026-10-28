"use client";

import { useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { saveBatch } from "../lotes/actions";

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** «Guardar lote»: asks for the production day, then saves the calculation as a planned batch. */
export function SaveBatch({ recipeId, pieces }: { recipeId: number; pieces: number }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setDate(today());
          setOpen(true);
        }}
        className={primaryButtonClass}
      >
        Guardar lote
      </button>
    );
  }

  return (
    <div className="col-span-2 space-y-3 rounded-2xl bg-crema p-4">
      <div>
        <label htmlFor="batch-date" className={labelClass}>¿Para qué día es?</label>
        <input id="batch-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={`${inputClass} bg-white`} />
      </div>
      <p className="text-sm text-tinta-suave">Se guarda como planeado, con las cantidades de {pieces} {pieces === 1 ? "pieza" : "piezas"} tal como están ahora.</p>
      <FieldError id="batch-error" message={error} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setOpen(false)} className={`${secondaryButtonClass} bg-white`}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const result = await saveBatch(recipeId, pieces, date);
              if (result?.error) setError(result.error);
            })
          }
          className={primaryButtonClass}
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
