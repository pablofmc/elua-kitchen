"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";
import { FieldError } from "@/components/field-error";
import { cardClass, inputClass, labelClass, primaryButtonClass } from "@/components/ui";
import { UNIT_SHORT, type IngredientKind, type Unit } from "@/lib/ingredients";
import { shrinkFormImage } from "@/lib/shrink-image";
import {
  CATEGORY_LABELS,
  validateRecipeDraft,
  type ComponentDraft,
  type DraftErrors,
  type LineDraft,
  type RecipeCategory,
  type RecipeDraft,
  type StepDraft,
} from "@/lib/recipes";

export type CatalogIngredient = { id: number; name: string; kind: IngredientKind; default_unit: Unit; grams_per_unit: number | null };

export type RecipeFormState = { status: "idle" | "error"; errors?: DraftErrors; message?: string };

type Props = {
  action: (prev: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
  ingredients: CatalogIngredient[];
  initial: RecipeDraft;
  submitLabel: string;
  /** Shown when editing: the note that explains a new version. */
  withChangeNote?: boolean;
  withPhoto?: boolean;
  /** After an import: why a field was left empty, keyed like errors. */
  review?: DraftErrors;
};

const idle: RecipeFormState = { status: "idle" };

export function RecipeForm({ action, ingredients, initial, submitLabel, withChangeNote = false, withPhoto = false, review = {} }: Props) {
  const [state, formAction, pending] = useActionState(action, idle);
  const [draft, setDraft] = useState<RecipeDraft>(initial);
  const [clientErrors, setClientErrors] = useState<DraftErrors | null>(null);
  // New rows get keys from a counter; initial rows already carry stable keys for hydration.
  const nextKey = useRef(0);
  const newKey = (prefix: string) => `${prefix}-new-${nextKey.current++}`;

  const errors = clientErrors ?? (state.status === "error" ? state.errors ?? {} : {});
  const hasErrors = Object.keys(errors).length > 0;
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));

  function update(change: (current: RecipeDraft) => RecipeDraft) {
    setDraft(change);
    setClientErrors(null);
  }

  function updateComponent(c: number, change: (component: ComponentDraft) => ComponentDraft) {
    update((current) => ({ ...current, components: current.components.map((item, i) => (i === c ? change(item) : item)) }));
  }

  function updateLine(c: number, l: number, change: Partial<LineDraft>) {
    updateComponent(c, (component) => ({ ...component, lines: component.lines.map((line, i) => (i === l ? { ...line, ...change } : line)) }));
  }

  function updateStep(s: number, change: Partial<StepDraft>) {
    update((current) => ({ ...current, steps: current.steps.map((step, i) => (i === s ? { ...step, ...change } : step)) }));
  }

  function chooseIngredient(c: number, l: number, id: number | null) {
    const ingredient = id === null ? undefined : byId.get(id);
    updateLine(c, l, {
      ingredient_id: id,
      ...(ingredient ? { unit: ingredient.default_unit, counts_as_flour: ingredient.kind === "harina" } : {}),
    });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const checked = validateRecipeDraft(draft, ingredients);
    if ("errors" in checked) {
      setClientErrors(checked.errors);
      return;
    }
    const formData = new FormData(event.currentTarget);
    formData.set("draft", JSON.stringify(draft));
    await shrinkFormImage(formData, "photo");
    startTransition(() => formAction(formData));
  }

  // Notes from an import on fields it left empty; each disappears once its field is filled.
  function reviewNote(key: string, empty: boolean, errorPath = key) {
    return empty && !errors[errorPath] ? review[key] : undefined;
  }

  return (
    <form action={formAction} onSubmit={submit} className="space-y-6" noValidate>
      <section className={`${cardClass} space-y-4 p-4`}>
        <div>
          <label htmlFor="recipe-name" className={labelClass}>Nombre</label>
          <input
            id="recipe-name"
            value={draft.name}
            onChange={(event) => update((current) => ({ ...current, name: event.target.value }))}
            maxLength={120}
            autoComplete="off"
            aria-invalid={errors.name ? true : undefined}
            className={inputClass}
          />
          <FieldError id="recipe-name-error" message={errors.name} />
          <ReviewNote id="recipe-name-review" message={reviewNote("name", !draft.name.trim())} />
        </div>

        <fieldset>
          <legend className={labelClass}>Categoría</legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(Object.keys(CATEGORY_LABELS) as RecipeCategory[]).map((category) => (
              <label
                key={category}
                className={`flex min-h-12 cursor-pointer items-center justify-center rounded-lg border text-base font-semibold has-focus-visible:outline-2 has-focus-visible:outline-cafe-oscuro ${
                  draft.category === category ? "border-tinta bg-tinta text-white" : "border-borde bg-crema-claro text-tinta"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={category}
                  checked={draft.category === category}
                  onChange={() => update((current) => ({ ...current, category }))}
                  className="sr-only"
                />
                {CATEGORY_LABELS[category]}
              </label>
            ))}
          </div>
          <FieldError id="recipe-category-error" message={errors.category} />
          <ReviewNote id="recipe-category-review" message={reviewNote("category", draft.category === "")} />
        </fieldset>

        <div>
          <label htmlFor="recipe-yield" className={labelClass}>¿Cuántas piezas salen?</label>
          <input
            id="recipe-yield"
            inputMode="numeric"
            value={draft.base_yield}
            onChange={(event) => update((current) => ({ ...current, base_yield: event.target.value }))}
            placeholder="p. ej. 10"
            aria-invalid={errors.base_yield ? true : undefined}
            className={`${inputClass} max-w-40`}
          />
          <FieldError id="recipe-yield-error" message={errors.base_yield} />
          <ReviewNote id="recipe-yield-review" message={reviewNote("base_yield", !draft.base_yield.trim())} />
        </div>

        {withPhoto ? (
          <div>
            <label htmlFor="recipe-photo" className={labelClass}>Foto (opcional)</label>
            <input
              id="recipe-photo"
              name="photo"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="mt-1 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-crema file:px-4 file:font-semibold file:text-cafe-oscuro"
            />
            <FieldError id="recipe-photo-error" message={errors.photo} />
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ingredientes</h2>
        <FieldError id="components-error" message={errors.components} />
        <ReviewNote
          id="components-review"
          message={reviewNote("components", draft.components.every((component) => component.lines.every((line) => line.ingredient_id === null)))}
        />
        {draft.components.map((component, c) => (
          <div key={component.key} className={`${cardClass} overflow-hidden`}>
            <div className="flex items-end gap-2 border-b border-borde bg-crema px-4 py-3">
              <div className="flex-1">
                <label htmlFor={`${component.key}-name`} className="text-xs font-semibold uppercase tracking-wide text-tinta-suave">
                  Parte
                </label>
                <input
                  id={`${component.key}-name`}
                  value={component.name}
                  onChange={(event) => updateComponent(c, (item) => ({ ...item, name: event.target.value }))}
                  aria-invalid={errors[`components.${c}.name`] ? true : undefined}
                  className="block w-full rounded-md border border-transparent bg-transparent px-0 py-1 text-base font-semibold outline-none focus:border-cafe-oscuro focus:bg-white focus:px-2"
                />
              </div>
              {draft.components.length > 1 ? (
                <RemoveButton
                  label={`Quitar ${component.name || "esta parte"}`}
                  onClick={() => update((current) => ({ ...current, components: current.components.filter((_, i) => i !== c) }))}
                />
              ) : null}
            </div>
            <div className="px-4">
              <FieldError id={`${component.key}-name-error`} message={errors[`components.${c}.name`]} />
              <FieldError id={`${component.key}-lines-error`} message={errors[`components.${c}.lines`]} />
            </div>

            <ul className="divide-y divide-borde">
              {component.lines.map((line, l) => {
                const path = `components.${c}.lines.${l}`;
                const ingredient = line.ingredient_id === null ? undefined : byId.get(line.ingredient_id);
                return (
                  <li key={line.key} className="space-y-2 px-4 py-3">
                    <div>
                      <label htmlFor={`${line.key}-ingredient`} className="sr-only">Ingrediente</label>
                      <select
                        id={`${line.key}-ingredient`}
                        value={line.ingredient_id ?? ""}
                        onChange={(event) => chooseIngredient(c, l, event.target.value ? Number(event.target.value) : null)}
                        aria-invalid={errors[`${path}.ingredient_id`] ? true : undefined}
                        className={`${inputClass} mt-0`}
                      >
                        <option value="">Elige un ingrediente…</option>
                        {ingredients.map((option) => (
                          <option key={option.id} value={option.id}>{option.name}</option>
                        ))}
                      </select>
                      <FieldError id={`${line.key}-ingredient-error`} message={errors[`${path}.ingredient_id`]} />
                      <ReviewNote id={`${line.key}-ingredient-review`} message={reviewNote(`${line.key}.ingredient_id`, line.ingredient_id === null, `${path}.ingredient_id`)} />
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <label htmlFor={`${line.key}-quantity`} className="sr-only">Cantidad</label>
                        <input
                          id={`${line.key}-quantity`}
                          inputMode="decimal"
                          value={line.quantity}
                          onChange={(event) => updateLine(c, l, { quantity: event.target.value })}
                          placeholder="Cantidad"
                          aria-invalid={errors[`${path}.quantity`] ? true : undefined}
                          className={`${inputClass} mt-0 text-right tabular-nums`}
                        />
                      </div>
                      <div className="w-24">
                        <label htmlFor={`${line.key}-unit`} className="sr-only">Unidad</label>
                        <select
                          id={`${line.key}-unit`}
                          value={line.unit}
                          onChange={(event) => updateLine(c, l, { unit: event.target.value as Unit })}
                          aria-invalid={errors[`${path}.unit`] ? true : undefined}
                          className={`${inputClass} mt-0`}
                        >
                          {(Object.keys(UNIT_SHORT) as Unit[]).map((unit) => (
                            <option key={unit} value={unit}>{UNIT_SHORT[unit]}</option>
                          ))}
                        </select>
                      </div>
                      {component.lines.length > 1 ? (
                        <RemoveButton
                          label={`Quitar ${ingredient?.name ?? "este ingrediente"}`}
                          onClick={() => updateComponent(c, (item) => ({ ...item, lines: item.lines.filter((_, i) => i !== l) }))}
                        />
                      ) : null}
                    </div>
                    <FieldError id={`${line.key}-quantity-error`} message={errors[`${path}.quantity`]} />
                    <ReviewNote id={`${line.key}-quantity-review`} message={reviewNote(`${line.key}.quantity`, !line.quantity.trim(), `${path}.quantity`)} />
                    <FieldError id={`${line.key}-unit-error`} message={errors[`${path}.unit`]} />
                    <label className="flex min-h-11 items-center gap-3 text-sm">
                      <input
                        type="checkbox"
                        checked={line.counts_as_flour}
                        onChange={(event) => updateLine(c, l, { counts_as_flour: event.target.checked })}
                        className="size-5 accent-cafe-oscuro"
                      />
                      Cuenta como harina para los % panaderos
                    </label>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={() =>
                updateComponent(c, (item) => ({
                  ...item,
                  lines: [...item.lines, { key: newKey("l"), ingredient_id: null, quantity: "", unit: "g", counts_as_flour: false }],
                }))
              }
              className="flex min-h-12 w-full items-center justify-center border-t border-borde font-semibold text-cafe-oscuro hover:bg-crema-claro"
            >
              + Agregar ingrediente
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            update((current) => ({
              ...current,
              components: [
                ...current.components,
                { key: newKey("c"), name: "", lines: [{ key: newKey("l"), ingredient_id: null, quantity: "", unit: "g", counts_as_flour: false }] },
              ],
            }))
          }
          className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-dashed border-cafe-oscuro/50 font-semibold text-cafe-oscuro hover:bg-white"
        >
          + Agregar otra parte (relleno, frosting…)
        </button>
        {ingredients.length === 0 ? (
          <p className="text-sm text-tinta-suave">
            Aún no hay ingredientes en el catálogo. <Link href="/recetas/ingredientes" className="font-semibold underline">Agrégalos aquí</Link>.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Pasos del proceso</h2>
        {draft.steps.length === 0 ? <p className="text-sm text-tinta-suave">Opcional. Sirven para los temporizadores.</p> : null}
        {draft.steps.map((step, s) => {
          const path = `steps.${s}`;
          const repeats = Number(step.repeats || "1");
          return (
            <div key={step.key} className={`${cardClass} space-y-3 p-4`}>
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <label htmlFor={`${step.key}-name`} className={labelClass}>Paso {s + 1}</label>
                  <input
                    id={`${step.key}-name`}
                    value={step.name}
                    onChange={(event) => updateStep(s, { name: event.target.value })}
                    placeholder="p. ej. Pliegues"
                    aria-invalid={errors[`${path}.name`] ? true : undefined}
                    className={inputClass}
                  />
                </div>
                <RemoveButton
                  label={`Quitar paso ${s + 1}`}
                  className="mt-7"
                  onClick={() => update((current) => ({ ...current, steps: current.steps.filter((_, i) => i !== s) }))}
                />
              </div>
              <FieldError id={`${step.key}-name-error`} message={errors[`${path}.name`]} />
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={step.is_manual}
                  onChange={(event) => updateStep(s, { is_manual: event.target.checked })}
                  className="size-5 accent-cafe-oscuro"
                />
                Manual: sin tiempo, se marca al terminar
              </label>
              {step.is_manual ? null : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField id={`${step.key}-hours`} label="Horas" value={step.duration_hours} invalid={Boolean(errors[`${path}.duration_minutes`])} onChange={(value) => updateStep(s, { duration_hours: value })} />
                    <NumberField id={`${step.key}-duration`} label="Minutos" value={step.duration_minutes} invalid={Boolean(errors[`${path}.duration_minutes`])} onChange={(value) => updateStep(s, { duration_minutes: value })} />
                  </div>
                  <FieldError id={`${step.key}-duration-error`} message={errors[`${path}.duration_minutes`]} />
                  <ReviewNote id={`${step.key}-duration-review`} message={reviewNote(`${step.key}.duration_minutes`, !step.duration_hours.trim() && !step.duration_minutes.trim(), `${path}.duration_minutes`)} />
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField id={`${step.key}-repeats`} label="Veces" value={step.repeats} placeholder="1" error={errors[`${path}.repeats`]} onChange={(value) => updateStep(s, { repeats: value })} />
                    {repeats > 1 ? (
                      <NumberField id={`${step.key}-interval`} label="Cada (min)" value={step.interval_minutes} error={errors[`${path}.interval_minutes`]} onChange={(value) => updateStep(s, { interval_minutes: value })} />
                    ) : null}
                  </div>
                  <ReviewNote id={`${step.key}-interval-review`} message={reviewNote(`${step.key}.interval_minutes`, repeats > 1 && !step.interval_minutes.trim(), `${path}.interval_minutes`)} />
                </>
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={() =>
            update((current) => ({
              ...current,
              steps: [...current.steps, { key: newKey("s"), name: "", is_manual: false, duration_hours: "", duration_minutes: "", repeats: "", interval_minutes: "" }],
            }))
          }
          className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-dashed border-cafe-oscuro/50 font-semibold text-cafe-oscuro hover:bg-white"
        >
          + Agregar paso
        </button>
      </section>

      {withChangeNote ? (
        <div>
          <label htmlFor="recipe-note" className={labelClass}>¿Qué cambió? (opcional)</label>
          <input
            id="recipe-note"
            value={draft.change_note}
            onChange={(event) => update((current) => ({ ...current, change_note: event.target.value }))}
            maxLength={500}
            placeholder="p. ej. Menos azúcar en el relleno"
            className={inputClass}
          />
        </div>
      ) : null}

      <div className="sticky bottom-20 z-10 space-y-2 rounded-2xl bg-crema-claro/95 py-2 backdrop-blur md:bottom-4">
        {hasErrors ? <FieldError id="form-errors" message="Revisa los campos marcados." /> : null}
        <FieldError id="form-message" message={state.status === "error" ? state.message : undefined} />
        <button type="submit" disabled={pending} className={`${primaryButtonClass} w-full`}>
          {pending ? "Guardando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

/** A field an import left empty, marked with a celeste dot so it reads as "check this", not as an error. */
function ReviewNote({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-tinta-suave">
      <span className="mr-1 inline-block size-2 rounded-full bg-celeste" aria-hidden />
      {message}
    </p>
  );
}

function NumberField({
  id,
  label,
  value,
  placeholder,
  error,
  invalid = Boolean(error),
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  error?: string;
  /** For fields that share one error message shown elsewhere. */
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-tinta-suave">{label}</label>
      <input
        id={id}
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid ? true : undefined}
        className={`${inputClass} text-right tabular-nums`}
      />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function RemoveButton({ label, onClick, className = "" }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex size-11 shrink-0 items-center justify-center rounded-lg text-tinta-suave outline-cafe-oscuro hover:bg-crema hover:text-tinta focus-visible:outline-2 ${className}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
  );
}
