"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import { cardClass, inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { KIND_LABELS, UNIT_LABELS, type IngredientKind, type Unit } from "@/lib/ingredients";
import { draftFromImport, type ImportedRecipe } from "@/lib/recipe-import";
import { shrinkFormImage } from "@/lib/shrink-image";
import { createRecipe } from "../nueva/actions";
import { RecipeForm, type CatalogIngredient } from "../recipe-form";
import { addIngredients, readRecipe, type NewIngredientInput, type ReadState } from "./actions";

const idle: ReadState = { reads: 0 };

/** Read a recipe with the AI, confirm any new ingredients, then review it in the normal recipe form. */
export function ImportFlow({ ingredients }: { ingredients: CatalogIngredient[] }) {
  const [state, readAction, reading] = useActionState(readRecipe, idle);
  const [catalog, setCatalog] = useState(ingredients);
  // Which read the user has finished confirming ingredients for; a new read asks again.
  const [confirmedRead, setConfirmedRead] = useState(0);
  const [restarted, setRestarted] = useState(0);

  const read = state.imported && state.reads > restarted ? { reads: state.reads, imported: state.imported } : null;
  const result = read ? draftFromImport(read.imported, catalog) : null;

  if (!read || !result) {
    return <ReadForm action={readAction} pending={reading} error={state.error} />;
  }

  const restart = () => setRestarted(read.reads);

  if (result.newIngredients.length > 0 && confirmedRead < read.reads) {
    return (
      <NewIngredients
        key={read.reads}
        imported={read.imported}
        proposals={result.newIngredients}
        onAdded={(next) => {
          setCatalog(next);
          setConfirmedRead(read.reads);
        }}
        onSkip={() => setConfirmedRead(read.reads)}
        onRestart={restart}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className={`${cardClass} space-y-2 p-4 text-sm`}>
        <p>
          <span className="font-semibold">Revisa la receta antes de guardarla.</span> La IA llenó lo que pudo leer; lo que no entendió quedó vacío y
          marcado con <span className="inline-block size-2 rounded-full bg-celeste align-middle" aria-hidden /> <span className="sr-only">un punto celeste</span>.
        </p>
        <button type="button" onClick={restart} className="min-h-11 font-semibold text-cafe-oscuro underline">
          Leer otra receta
        </button>
      </div>
      <RecipeForm
        key={`${read.reads}-${catalog.length}`}
        action={createRecipe}
        ingredients={catalog}
        initial={result.draft}
        review={result.review}
        submitLabel="Guardar receta"
        withPhoto
      />
    </div>
  );
}

function ReadForm({ action, pending, error }: { action: (formData: FormData) => void; pending: boolean; error?: string }) {
  const [preparing, setPreparing] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setPreparing(true);
    await shrinkFormImage(formData, "image");
    setPreparing(false);
    startTransition(() => action(formData));
  }

  const busy = pending || preparing;
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className={`${cardClass} space-y-4 p-4`}>
        <div>
          <label htmlFor="import-text" className={labelClass}>Pega la receta</label>
          <textarea
            id="import-text"
            name="text"
            rows={8}
            maxLength={20000}
            placeholder={"p. ej.\nRollos de canela (rinde 10)\nMasa: 500 g harina, 60 g azúcar, 2 huevos…"}
            className={`${inputClass} resize-y`}
          />
        </div>
        <p className="text-center text-sm text-tinta-suave">o</p>
        <div>
          <label htmlFor="import-image" className={labelClass}>Toma o elige una foto</label>
          <input
            id="import-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-crema file:px-4 file:font-semibold file:text-cafe-oscuro"
          />
        </div>
      </div>
      <FieldError id="import-error" message={error} />
      <button type="submit" disabled={busy} className={`${primaryButtonClass} w-full`}>
        {busy ? "Leyendo receta…" : "Leer receta"}
      </button>
      <p className="text-xs text-tinta-suave">Nada se guarda todavía: primero revisas la receta en el formulario.</p>
    </form>
  );
}

type Row = { name: string; kind: IngredientKind; default_unit: Unit; grams_per_unit: string; include: boolean };

function NewIngredients({
  imported,
  proposals,
  onAdded,
  onSkip,
  onRestart,
}: {
  imported: ImportedRecipe;
  proposals: { name: string; kind: IngredientKind; default_unit: Unit }[];
  onAdded: (catalog: CatalogIngredient[]) => void;
  onSkip: () => void;
  onRestart: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(proposals.map((item) => ({ ...item, grams_per_unit: "", include: true })));
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [message, setMessage] = useState<string>();
  const [pending, startAdding] = useTransition();

  const update = (i: number, change: Partial<Row>) => setRows((current) => current.map((row, j) => (j === i ? { ...row, ...change } : row)));
  const chosen = rows.map((row, i) => ({ row, i })).filter(({ row }) => row.include);

  function add() {
    const items: NewIngredientInput[] = chosen.map(({ row }) => ({
      name: row.name,
      kind: row.kind,
      default_unit: row.default_unit,
      grams_per_unit: row.default_unit === "unidad" ? Number(row.grams_per_unit.replace(",", ".")) : null,
    }));
    startAdding(async () => {
      const result = await addIngredients(items);
      if ("catalog" in result) onAdded(result.catalog);
      else if ("errors" in result) {
        setErrors(Object.fromEntries(Object.entries(result.errors).map(([k, v]) => [chosen[Number(k)].i, v])));
        setMessage(undefined);
      } else setMessage(result.message);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Ingredientes nuevos</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          {imported.name ? `«${imported.name}» usa` : "La receta usa"} ingredientes que aún no están en el catálogo. Revisa cómo se guardan; los que
          desmarques quedan vacíos en la receta para elegirlos a mano.
        </p>
      </div>
      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li key={i} className={`${cardClass} space-y-3 p-4`}>
            <label className="flex min-h-11 items-center gap-3 font-semibold">
              <input type="checkbox" checked={row.include} onChange={(event) => update(i, { include: event.target.checked })} className="size-5 accent-cafe-oscuro" />
              Agregar «{row.name}»
            </label>
            {row.include ? (
              <>
                <div>
                  <label htmlFor={`new-${i}-name`} className={labelClass}>Nombre</label>
                  <input id={`new-${i}-name`} value={row.name} maxLength={80} onChange={(event) => update(i, { name: event.target.value })} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`new-${i}-kind`} className={labelClass}>Tipo</label>
                    <select id={`new-${i}-kind`} value={row.kind} onChange={(event) => update(i, { kind: event.target.value as IngredientKind })} className={inputClass}>
                      {(Object.keys(KIND_LABELS) as IngredientKind[]).map((kind) => (
                        <option key={kind} value={kind}>{KIND_LABELS[kind]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`new-${i}-unit`} className={labelClass}>Se mide en</label>
                    <select id={`new-${i}-unit`} value={row.default_unit} onChange={(event) => update(i, { default_unit: event.target.value as Unit })} className={inputClass}>
                      {(Object.keys(UNIT_LABELS) as Unit[]).map((unit) => (
                        <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {row.default_unit === "unidad" ? (
                  <div>
                    <label htmlFor={`new-${i}-grams`} className={labelClass}>Gramos por unidad</label>
                    <input
                      id={`new-${i}-grams`}
                      inputMode="decimal"
                      value={row.grams_per_unit}
                      onChange={(event) => update(i, { grams_per_unit: event.target.value })}
                      placeholder="p. ej. 50 para un huevo"
                      className={`${inputClass} max-w-40`}
                    />
                  </div>
                ) : null}
                <FieldError id={`new-${i}-error`} message={errors[i]} />
              </>
            ) : null}
          </li>
        ))}
      </ul>
      <FieldError id="new-ingredients-error" message={message} />
      <div className="space-y-2">
        {chosen.length > 0 ? (
          <button type="button" onClick={add} disabled={pending} className={`${primaryButtonClass} w-full`}>
            {pending ? "Agregando…" : `Agregar ${chosen.length === 1 ? "1 ingrediente" : `${chosen.length} ingredientes`} y seguir`}
          </button>
        ) : (
          <button type="button" onClick={onSkip} className={`${primaryButtonClass} w-full`}>
            Seguir sin agregar
          </button>
        )}
        <button type="button" onClick={onRestart} className={`${secondaryButtonClass} w-full`}>
          Leer otra receta
        </button>
      </div>
    </div>
  );
}
