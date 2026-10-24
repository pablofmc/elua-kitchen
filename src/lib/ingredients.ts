import type { Database } from "@/lib/supabase/database.types";

export type IngredientKind = Database["public"]["Enums"]["ingredient_kind"];
export type Unit = Database["public"]["Enums"]["unit"];
export type Ingredient = Database["public"]["Tables"]["ingredients"]["Row"];

export const KIND_LABELS: Record<IngredientKind, string> = {
  harina: "Harina",
  liquido: "Líquido",
  masa_madre: "Masa madre",
  sal: "Sal",
  grasa: "Grasa",
  azucar: "Azúcar",
  otro: "Otro",
};

export const UNIT_LABELS: Record<Unit, string> = {
  g: "Gramos (g)",
  ml: "Mililitros (ml)",
  unidad: "Unidades",
};

export const UNIT_SHORT: Record<Unit, string> = { g: "g", ml: "ml", unidad: "u" };

export type IngredientInput = {
  name: string;
  kind: IngredientKind;
  default_unit: Unit;
  grams_per_unit: number | null;
};

export type FieldErrors = Partial<Record<keyof IngredientInput, string>>;

function isKind(value: string): value is IngredientKind {
  return value in KIND_LABELS;
}

function isUnit(value: string): value is Unit {
  return value in UNIT_LABELS;
}

/** Reads and validates the ingredient form. Grams per unit only apply to unit ingredients. */
export function parseIngredientForm(formData: FormData): { data: IngredientInput } | { errors: FieldErrors } {
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  const kind = String(formData.get("kind") ?? "");
  const unit = String(formData.get("default_unit") ?? "");
  const gramsRaw = String(formData.get("grams_per_unit") ?? "").trim().replace(",", ".");

  const errors: FieldErrors = {};
  if (!name) errors.name = "Escribe el nombre.";
  else if (name.length > 80) errors.name = "Máximo 80 caracteres.";
  if (!isKind(kind)) errors.kind = "Elige un tipo.";
  if (!isUnit(unit)) errors.default_unit = "Elige una unidad.";

  let grams: number | null = null;
  if (unit === "unidad") {
    grams = Number(gramsRaw);
    if (!gramsRaw || !Number.isFinite(grams) || grams <= 0) errors.grams_per_unit = "Escribe cuántos gramos pesa cada una.";
  }

  if (Object.keys(errors).length > 0 || !isKind(kind) || !isUnit(unit)) return { errors };
  return { data: { name, kind, default_unit: unit, grams_per_unit: grams } };
}
