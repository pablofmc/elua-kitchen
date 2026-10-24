/**
 * Elúa's recipe math. Pure functions only: no React, no Supabase, no I/O.
 * Rules and golden cases: .claude/skills/elua-calculos/SKILL.md and docs/plan-fase-1.html §04.
 */
import type { IngredientKind, Unit } from "@/lib/ingredients";

export type CalcLine = {
  ingredientId: number;
  name: string;
  kind: IngredientKind;
  quantity: number;
  unit: Unit;
  /** Grams per unit for unit ingredients (eggs); ignored otherwise. */
  gramsPerUnit: number | null;
  countsAsFlour: boolean;
};

export type CalcComponent = { name: string; lines: CalcLine[] };
export type CalcRecipe = { baseYield: number; components: CalcComponent[] };

/** Phase 1 assumes a 100 % hydration starter. */
export const STARTER_HYDRATION = 1;

/** Grams a line weighs. ml counts 1:1 with g; units use their grams per unit. */
export function lineGrams(line: Pick<CalcLine, "quantity" | "unit" | "gramsPerUnit">): number {
  if (line.unit === "unidad") return line.quantity * (line.gramsPerUnit ?? 0);
  return line.quantity;
}

export function totalGrams(recipe: CalcRecipe): number {
  return recipe.components.reduce((sum, component) => sum + component.lines.reduce((acc, line) => acc + lineGrams(line), 0), 0);
}

/** Every line of every component multiplied by pieces ÷ base yield. Full precision. */
export function scaleRecipe(recipe: CalcRecipe, pieces: number): CalcRecipe & { factor: number } {
  const factor = pieces / recipe.baseYield;
  return {
    factor,
    baseYield: pieces,
    components: recipe.components.map((component) => ({
      ...component,
      lines: component.lines.map((line) => ({ ...line, quantity: line.quantity * factor })),
    })),
  };
}

export type Hydration = {
  addedFlour: number;
  starter: number;
  flourInStarter: number;
  waterInStarter: number;
  totalFlour: number;
  addedWater: number;
  /** (added water + water in starter) ÷ total flour. */
  trueHydration: number;
  /** Added water ÷ added flour, as most recipes are written. */
  hydrationOverAddedFlour: number;
};

/** Flour, water and starter across the whole recipe. Null when there is no flour to compare against. */
export function hydration(recipe: CalcRecipe): Hydration | null {
  let addedFlour = 0;
  let addedWater = 0;
  let starter = 0;
  for (const component of recipe.components) {
    for (const line of component.lines) {
      const grams = lineGrams(line);
      if (line.kind === "masa_madre") starter += grams;
      else if (line.countsAsFlour) addedFlour += grams;
      else if (line.kind === "liquido") addedWater += grams;
    }
  }
  if (addedFlour <= 0) return null;

  const flourInStarter = starter / (1 + STARTER_HYDRATION);
  const waterInStarter = starter - flourInStarter;
  const totalFlour = addedFlour + flourInStarter;
  return {
    addedFlour,
    starter,
    flourInStarter,
    waterInStarter,
    totalFlour,
    addedWater,
    trueHydration: (addedWater + waterInStarter) / totalFlour,
    hydrationOverAddedFlour: addedWater / addedFlour,
  };
}

/** A line as a fraction of a flour base (added flour or total flour). */
export function bakersPercent(line: Pick<CalcLine, "quantity" | "unit" | "gramsPerUnit">, flourBase: number): number {
  return lineGrams(line) / flourBase;
}
