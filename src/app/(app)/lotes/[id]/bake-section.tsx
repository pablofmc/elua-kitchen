"use client";

import Image from "next/image";
import { startTransition, useActionState, useState } from "react";
import { FieldError } from "@/components/field-error";
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { formatDayAndTime } from "@/lib/dates";
import { shrinkFormImage } from "@/lib/shrink-image";
import { recordBake, type BakeState } from "../actions";
import { Stars } from "../batch-row";

type Props = {
  id: number;
  status: "planeado" | "horneado";
  plannedPieces: number;
  actualPieces: number | null;
  rating: number | null;
  notes: string | null;
  photoUrl: string | null;
  bakedAt: string | null;
};


/** «Marcar como horneado» on a planned batch; what happened, editable, on a baked one. */
export function BakeSection(props: Props) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(recordBake.bind(null, props.id), { saves: 0 } as BakeState);
  // A successful save closes the form; `saves` tells a new save from an old one.
  const [closedAt, setClosedAt] = useState(0);
  const open = editing && state.saves === closedAt;

  if (!open) {
    if (props.status === "planeado") {
      return (
        <button
          type="button"
          onClick={() => {
            setClosedAt(state.saves);
            setEditing(true);
          }}
          className={`${primaryButtonClass} w-full min-h-12`}
        >
          Marcar como horneado
        </button>
      );
    }
    return (
      <section className={`${cardClass} space-y-3 p-4`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Cómo salió</h2>
            {props.bakedAt ? <p className="text-sm text-tinta-suave">Horneado el {formatDayAndTime(props.bakedAt)}</p> : null}
          </div>
          <button
            type="button"
            onClick={() => {
              setClosedAt(state.saves);
              setEditing(true);
            }}
            className={`${secondaryButtonClass} shrink-0 px-4 py-2`}
          >
            Editar
          </button>
        </div>
        <p className="font-semibold tabular-nums">
          {props.actualPieces} de {props.plannedPieces} {props.plannedPieces === 1 ? "pieza" : "piezas"}
          {props.rating ? (
            <span className="ml-3">
              <Stars rating={props.rating} />
            </span>
          ) : null}
        </p>
        {props.notes ? <p className="whitespace-pre-line text-sm">{props.notes}</p> : null}
        {props.photoUrl ? <Image src={props.photoUrl} alt="Foto del horneado" width={720} height={540} unoptimized className="w-full rounded-xl object-cover" /> : null}
      </section>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await shrinkFormImage(formData, "photo");
    startTransition(() => formAction(formData));
  }

  const errors = state.errors ?? {};
  return (
    <form onSubmit={submit} className={`${cardClass} space-y-4 p-4`} noValidate>
      <h2 className="text-lg font-semibold">{props.status === "planeado" ? "Marcar como horneado" : "Editar cómo salió"}</h2>
      <div>
        <label htmlFor="actual-pieces" className={labelClass}>¿Cuántas piezas salieron?</label>
        <input
          id="actual-pieces"
          name="actual_pieces"
          inputMode="numeric"
          defaultValue={props.actualPieces ?? props.plannedPieces}
          aria-invalid={errors.actual_pieces ? true : undefined}
          className={`${inputClass} max-w-40 text-right tabular-nums`}
        />
        <p className="mt-1 text-xs text-tinta-suave">Se planearon {props.plannedPieces}. Pueden ser menos.</p>
        <FieldError id="actual-pieces-error" message={errors.actual_pieces} />
      </div>
      <fieldset>
        <legend className={labelClass}>Calificación (opcional)</legend>
        <div className="mt-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="flex size-11 cursor-pointer items-center justify-center rounded-lg border border-borde text-xl has-checked:border-cafe-oscuro has-checked:bg-crema has-focus-visible:outline-2 has-focus-visible:outline-cafe-oscuro">
              <input type="radio" name="rating" value={value} defaultChecked={props.rating === value} className="sr-only" />
              <span aria-hidden>★</span>
              <span className="sr-only">{value} de 5</span>
            </label>
          ))}
        </div>
        <FieldError id="rating-error" message={errors.rating} />
      </fieldset>
      <div>
        <label htmlFor="bake-notes" className={labelClass}>Notas (opcional)</label>
        <textarea
          id="bake-notes"
          name="notes"
          rows={4}
          maxLength={2000}
          defaultValue={props.notes ?? ""}
          placeholder="p. ej. Horno a 200 °C, 25 min. La masa fermentó más rápido por el calor."
          className={`${inputClass} resize-y`}
        />
        <FieldError id="bake-notes-error" message={errors.notes} />
      </div>
      <div>
        <label htmlFor="bake-photo" className={labelClass}>{props.photoUrl ? "Cambiar foto (opcional)" : "Foto (opcional)"}</label>
        <input
          id="bake-photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          className="mt-1 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-crema file:px-4 file:font-semibold file:text-cafe-oscuro"
        />
        <FieldError id="bake-photo-error" message={errors.photo} />
      </div>
      <FieldError id="bake-error" message={state.error} />
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setEditing(false)} className={secondaryButtonClass}>
          Cancelar
        </button>
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
