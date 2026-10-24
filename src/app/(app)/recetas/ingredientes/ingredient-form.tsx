"use client";

import { startTransition, useActionState, useState } from "react";
import { KIND_LABELS, UNIT_LABELS, type FieldErrors, type IngredientInput, type IngredientKind, type Unit } from "@/lib/ingredients";
import { inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { FieldError } from "@/components/field-error";
import type { IngredientFormState } from "./actions";

type Props = {
  action: (prev: IngredientFormState, formData: FormData) => Promise<IngredientFormState>;
  initial?: IngredientInput;
  submitLabel: string;
  idPrefix: string;
};

const idle: IngredientFormState = { status: "idle" };

export function IngredientForm({ action, initial, submitLabel, idPrefix }: Props) {
  const [state, formAction, pending] = useActionState(action, idle);
  const errors = state.status === "error" ? state.errors ?? {} : {};
  const defaults = {
    name: initial?.name ?? "",
    kind: initial?.kind ?? "otro",
    unit: initial?.default_unit ?? "g",
    grams: initial?.grams_per_unit != null ? String(initial.grams_per_unit) : "",
  };

  // Submitting through onSubmit skips React's automatic form reset, so an error keeps what was typed.
  // After a save, the fields remount empty for the next ingredient.
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form action={formAction} onSubmit={submit} className="space-y-4" noValidate>
      <Fields key={state.saves ?? 0} idPrefix={idPrefix} defaults={defaults} errors={errors} />

      <FieldError id={`${idPrefix}-form-error`} message={state.status === "error" ? state.message : undefined} />
      {state.status === "saved" ? (
        <p role="status" className="text-sm text-tinta">
          <span className="mr-1 inline-block size-2 rounded-full bg-celeste" aria-hidden />
          Guardado: {state.savedName}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full`}>
        {pending ? "Guardando…" : submitLabel}
      </button>
    </form>
  );
}

type FieldsProps = {
  idPrefix: string;
  defaults: { name: string; kind: IngredientKind; unit: Unit; grams: string };
  errors: FieldErrors;
};

function Fields({ idPrefix, defaults, errors }: FieldsProps) {
  // Only decides whether the grams field shows; the select itself stays uncontrolled.
  const [unit, setUnit] = useState<Unit>(defaults.unit);

  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-name`} className={labelClass}>Nombre</label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          required
          maxLength={80}
          defaultValue={defaults.name}
          autoComplete="off"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${idPrefix}-name-error` : undefined}
          className={inputClass}
        />
        <FieldError id={`${idPrefix}-name-error`} message={errors.name} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-kind`} className={labelClass}>Tipo</label>
          <select id={`${idPrefix}-kind`} name="kind" defaultValue={defaults.kind} className={inputClass}>
            {(Object.keys(KIND_LABELS) as IngredientKind[]).map((kind) => (
              <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>
            ))}
          </select>
          <FieldError id={`${idPrefix}-kind-error`} message={errors.kind} />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-unit`} className={labelClass}>Se mide en</label>
          <select
            id={`${idPrefix}-unit`}
            name="default_unit"
            defaultValue={defaults.unit}
            onChange={(event) => setUnit(event.target.value as Unit)}
            className={inputClass}
          >
            {(Object.keys(UNIT_LABELS) as Unit[]).map((option) => (
              <option key={option} value={option}>{UNIT_LABELS[option]}</option>
            ))}
          </select>
          <FieldError id={`${idPrefix}-unit-error`} message={errors.default_unit} />
        </div>
      </div>

      {unit === "unidad" ? (
        <div>
          <label htmlFor={`${idPrefix}-grams`} className={labelClass}>Gramos por unidad</label>
          <input
            id={`${idPrefix}-grams`}
            name="grams_per_unit"
            inputMode="decimal"
            defaultValue={defaults.grams}
            placeholder="p. ej. 50 para un huevo"
            aria-invalid={errors.grams_per_unit ? true : undefined}
            aria-describedby={errors.grams_per_unit ? `${idPrefix}-grams-error` : undefined}
            className={inputClass}
          />
          <FieldError id={`${idPrefix}-grams-error`} message={errors.grams_per_unit} />
        </div>
      ) : null}
    </>
  );
}
