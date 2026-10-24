import { z } from "zod";
import { KIND_LABELS, type IngredientKind, type Unit } from "@/lib/ingredients";
import { splitMinutes, type DraftErrors, type RecipeDraft } from "@/lib/recipes";

/**
 * What the AI returns when it reads a pasted or photographed recipe. Anything it can't read is
 * null, never guessed, so the form can leave that field empty and point at it.
 */
export const ImportedRecipeSchema = z.object({
  name: z.string().nullable(),
  category: z.enum(["dulce", "salado"]).nullable(),
  base_yield: z.number().int().nullable(),
  components: z.array(
    z.object({
      name: z.string(),
      lines: z.array(
        z.object({
          ingredient: z.string(),
          kind: z.enum(Object.keys(KIND_LABELS) as [IngredientKind, ...IngredientKind[]]),
          quantity: z.number().nullable(),
          unit: z.enum(["g", "ml", "unidad"]).nullable(),
          original: z.string(),
        }),
      ),
    }),
  ),
  steps: z.array(
    z.object({
      name: z.string(),
      is_manual: z.boolean(),
      duration_minutes: z.number().int().nullable(),
      repeats: z.number().int().nullable(),
      interval_minutes: z.number().int().nullable(),
    }),
  ),
});

export type ImportedRecipe = z.infer<typeof ImportedRecipeSchema>;

/** An ingredient the recipe uses that the catalog doesn't have yet. */
export type ProposedIngredient = { name: string; kind: IngredientKind; default_unit: Unit };

type CatalogItem = { id: number; name: string; kind: IngredientKind; default_unit: Unit };

/** Matching key for ingredient names: case, accents and extra spaces don't matter. */
export function ingredientKey(name: string) {
  return name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
}

function cleanName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function text(value: number | null) {
  return value === null ? "" : String(value);
}

/**
 * Turns what the AI read into a recipe form draft. Ingredients are matched to the catalog by name;
 * the rest come back as proposals. `review` explains every field left empty, keyed by field name
 * at the top and by row key below (`c1-l0.quantity`, `s2.duration_minutes`), so notes stay on their row
 * when rows are removed.
 */
export function draftFromImport(
  imported: ImportedRecipe,
  catalog: CatalogItem[],
): { draft: RecipeDraft; review: DraftErrors; newIngredients: ProposedIngredient[] } {
  const byKey = new Map(catalog.map((item) => [ingredientKey(item.name), item]));
  const review: DraftErrors = {};
  const proposals = new Map<string, ProposedIngredient>();

  const name = cleanName(imported.name ?? "");
  if (!name) review.name = "No se pudo leer el nombre.";
  if (!imported.category) review.category = "La receta no dice si es dulce o salada.";
  const baseYield = imported.base_yield !== null && imported.base_yield >= 1 ? imported.base_yield : null;
  if (baseYield === null) review.base_yield = "La receta no dice cuántas piezas salen.";

  const components = imported.components
    .map((component) => ({ ...component, lines: component.lines.filter((line) => cleanName(line.ingredient)) }))
    .filter((component) => component.lines.length > 0)
    .map((component, c) => ({
      key: `c${c}`,
      name: cleanName(component.name) || (c === 0 ? "Masa" : ""),
      lines: component.lines.map((line, l) => {
        const key = `c${c}-l${l}`;
        const ingredientName = cleanName(line.ingredient);
        const match = byKey.get(ingredientKey(ingredientName));
        if (!match) {
          review[`${key}.ingredient_id`] = `«${ingredientName}» no está en el catálogo.`;
          const nameKey = ingredientKey(ingredientName);
          if (!proposals.has(nameKey)) proposals.set(nameKey, { name: ingredientName, kind: line.kind, default_unit: line.unit ?? "g" });
        }
        const quantity = line.quantity !== null && line.quantity > 0 ? line.quantity : null;
        if (quantity === null || line.unit === null) {
          review[`${key}.quantity`] = `No se entendió la cantidad: «${cleanName(line.original) || ingredientName}».`;
        }
        return {
          key,
          ingredient_id: match?.id ?? null,
          quantity: line.unit === null ? "" : text(quantity),
          unit: line.unit ?? match?.default_unit ?? "g",
          counts_as_flour: (match?.kind ?? line.kind) === "harina",
        };
      }),
    }));

  const steps = imported.steps
    .filter((step) => cleanName(step.name))
    .map((step, s) => {
      const duration = step.duration_minutes !== null && step.duration_minutes >= 1 ? step.duration_minutes : null;
      if (!step.is_manual && duration === null) review[`s${s}.duration_minutes`] = "No se entendió cuánto dura.";
      const repeats = step.repeats !== null && step.repeats > 1 ? step.repeats : null;
      if (!step.is_manual && repeats !== null && !(step.interval_minutes && step.interval_minutes >= 1)) {
        review[`s${s}.interval_minutes`] = "No se entendió cada cuánto se repite.";
      }
      return {
        key: `s${s}`,
        name: cleanName(step.name),
        is_manual: step.is_manual,
        ...splitMinutes(step.is_manual ? null : duration),
        repeats: step.is_manual ? "" : text(repeats),
        interval_minutes: step.is_manual || repeats === null ? "" : text(step.interval_minutes),
      };
    });

  if (components.length === 0) review.components = "No se encontraron ingredientes; agrégalos a mano.";

  return {
    draft: {
      name,
      category: imported.category ?? "",
      base_yield: text(baseYield),
      change_note: "",
      components: components.length > 0 ? components : [{ key: "c0", name: "Masa", lines: [{ key: "c0-l0", ingredient_id: null, quantity: "", unit: "g", counts_as_flour: false }] }],
      steps,
    },
    review,
    newIngredients: [...proposals.values()],
  };
}
