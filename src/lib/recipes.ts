import type { Database, Json } from "@/lib/supabase/database.types";
import type { Unit } from "@/lib/ingredients";

export type RecipeCategory = Database["public"]["Enums"]["recipe_category"];

export const CATEGORY_LABELS: Record<RecipeCategory, string> = { dulce: "Dulce", salado: "Salado" };

/** What the recipe form edits. Numbers stay strings until validation so half-typed values survive. */
export type LineDraft = { key: string; ingredient_id: number | null; quantity: string; unit: Unit; counts_as_flour: boolean };
export type ComponentDraft = { key: string; name: string; lines: LineDraft[] };
export type StepDraft = {
  key: string;
  name: string;
  is_manual: boolean;
  duration_minutes: string;
  repeats: string;
  interval_minutes: string;
};
export type RecipeDraft = {
  name: string;
  category: RecipeCategory | "";
  base_yield: string;
  change_note: string;
  components: ComponentDraft[];
  steps: StepDraft[];
};

/** A new recipe starts with one "Masa" part and one empty line. */
export function emptyDraft(): RecipeDraft {
  return {
    name: "",
    category: "",
    base_yield: "",
    change_note: "",
    components: [{ key: "c0", name: "Masa", lines: [{ key: "c0-l0", ingredient_id: null, quantity: "", unit: "g", counts_as_flour: false }] }],
    steps: [],
  };
}

/** The version payload the `add_recipe_version` database function expects. */
export type VersionPayload = {
  base_yield: number;
  change_note: string | null;
  components: { name: string; lines: { ingredient_id: number; quantity: number; unit: Unit; counts_as_flour: boolean }[] }[];
  steps: { name: string; is_manual: boolean; duration_minutes: number | null; repeats: number; interval_minutes: number | null }[];
};

export type RecipePayload = { name: string; category: RecipeCategory; version: VersionPayload };

/** Error messages keyed by field path, e.g. `components.0.lines.1.quantity`. */
export type DraftErrors = Record<string, string>;

/** Catalog facts validation needs: unit lines must point at an ingredient with grams per unit. */
export type CatalogEntry = { id: number; grams_per_unit: number | null };

function parseNumber(raw: string) {
  const text = raw.trim().replace(",", ".");
  return text === "" ? NaN : Number(text);
}

function parseWhole(raw: string) {
  const value = parseNumber(raw);
  return Number.isInteger(value) ? value : NaN;
}

export function validateRecipeDraft(draft: RecipeDraft, catalog: CatalogEntry[]): { payload: RecipePayload } | { errors: DraftErrors } {
  const errors: DraftErrors = {};
  const gramsPerUnit = new Map(catalog.map((entry) => [entry.id, entry.grams_per_unit]));

  const name = draft.name.trim().replace(/\s+/g, " ");
  if (!name) errors.name = "Escribe el nombre de la receta.";
  else if (name.length > 120) errors.name = "Máximo 120 caracteres.";

  if (draft.category !== "dulce" && draft.category !== "salado") errors.category = "Elige Dulce o Salado.";

  const baseYield = parseWhole(draft.base_yield);
  if (!(baseYield >= 1)) errors.base_yield = "Escribe cuántas piezas salen (1 o más).";

  if (draft.components.length === 0) errors.components = "Agrega al menos un ingrediente.";
  const components = draft.components.map((component, c) => {
    const componentName = component.name.trim();
    if (!componentName) errors[`components.${c}.name`] = "Ponle nombre a esta parte (p. ej. Masa).";
    if (component.lines.length === 0) errors[`components.${c}.lines`] = "Agrega al menos un ingrediente o quita esta parte.";

    const lines = component.lines.map((line, l) => {
      const path = `components.${c}.lines.${l}`;
      if (line.ingredient_id === null) errors[`${path}.ingredient_id`] = "Elige un ingrediente.";
      else if (line.unit === "unidad" && !gramsPerUnit.get(line.ingredient_id)) {
        errors[`${path}.unit`] = "Este ingrediente no tiene gramos por unidad. Usa g o ml, o edítalo en Ingredientes.";
      }
      const quantity = parseNumber(line.quantity);
      if (!(quantity > 0)) errors[`${path}.quantity`] = "Escribe una cantidad mayor que 0.";
      return { ingredient_id: line.ingredient_id ?? 0, quantity, unit: line.unit, counts_as_flour: line.counts_as_flour };
    });
    return { name: componentName, lines };
  });

  const steps = draft.steps.map((step, s) => {
    const path = `steps.${s}`;
    const stepName = step.name.trim();
    if (!stepName) errors[`${path}.name`] = "Ponle nombre al paso.";
    if (step.is_manual) {
      return { name: stepName, is_manual: true, duration_minutes: null, repeats: 1, interval_minutes: null };
    }

    const duration = parseWhole(step.duration_minutes);
    if (!(duration >= 1)) errors[`${path}.duration_minutes`] = "Minutos enteros, 1 o más.";
    const repeats = step.repeats.trim() === "" ? 1 : parseWhole(step.repeats);
    if (!(repeats >= 1)) errors[`${path}.repeats`] = "Veces enteras, 1 o más.";
    let interval: number | null = null;
    if (repeats > 1) {
      interval = parseWhole(step.interval_minutes);
      if (!(interval >= 1)) errors[`${path}.interval_minutes`] = "¿Cada cuántos minutos se repite?";
    }
    return { name: stepName, is_manual: false, duration_minutes: duration, repeats, interval_minutes: interval };
  });

  if (Object.keys(errors).length > 0) return { errors };
  return {
    payload: {
      name,
      category: draft.category as RecipeCategory,
      version: { base_yield: baseYield, change_note: draft.change_note.trim() || null, components, steps },
    },
  };
}

/** For passing the version payload to supabase-js `rpc()`. */
export function toJson(version: VersionPayload): Json {
  return version as unknown as Json;
}

/** True when two versions differ in anything that affects a calculation or the process. The note doesn't count. */
export function versionChanged(a: VersionPayload, b: VersionPayload): boolean {
  const comparable = (version: VersionPayload) => JSON.stringify({ ...version, change_note: null });
  return comparable(a) !== comparable(b);
}

type SavedVersion = {
  baseYield: number;
  components: { name: string; lines: { ingredientId: number; quantity: number; unit: Unit; countsAsFlour: boolean }[] }[];
  steps: { name: string; isManual: boolean; durationMinutes: number | null; repeats: number; intervalMinutes: number | null }[];
};

/** The editable draft for a saved recipe version. Keys follow positions, so they match between server and client. */
export function draftFromVersion(name: string, category: RecipeCategory, version: SavedVersion): RecipeDraft {
  return {
    name,
    category,
    base_yield: String(version.baseYield),
    change_note: "",
    components: version.components.map((component, c) => ({
      key: `c${c}`,
      name: component.name,
      lines: component.lines.map((line, l) => ({
        key: `c${c}-l${l}`,
        ingredient_id: line.ingredientId,
        quantity: String(line.quantity),
        unit: line.unit,
        counts_as_flour: line.countsAsFlour,
      })),
    })),
    steps: version.steps.map((step, s) => ({
      key: `s${s}`,
      name: step.name,
      is_manual: step.isManual,
      duration_minutes: step.durationMinutes === null ? "" : String(step.durationMinutes),
      repeats: step.isManual || step.repeats === 1 ? "" : String(step.repeats),
      interval_minutes: step.intervalMinutes === null ? "" : String(step.intervalMinutes),
    })),
  };
}
