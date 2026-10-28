import { scaleRecipe, type CalcRecipe } from "@/lib/calc";

/**
 * A batch's fixed copy of what was calculated (skill elua-calculos → Batches). Full precision; the
 * screen rounds when it shows it. Never recomputed from the recipe.
 */
export type BatchSnapshot = {
  factor: number;
  /** The version's base yield the factor came from. */
  versionBaseYield: number;
  /** Scaled quantities; its baseYield is the planned pieces. */
  recipe: CalcRecipe;
};

export function makeSnapshot(recipe: CalcRecipe, pieces: number): BatchSnapshot {
  const { factor, ...scaled } = scaleRecipe(recipe, pieces);
  return { factor, versionBaseYield: recipe.baseYield, recipe: scaled };
}

/** A production date from a date input ("2026-10-28"), or null when it isn't a real calendar day. */
export function parseProductionDate(raw: string | null | undefined): string | null {
  const text = String(raw ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null;
}

const longDate = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortDate = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** "Miércoles, 28 de octubre de 2026". Dates have no time, so they're read at noon UTC to never shift a day. */
export function formatProductionDate(date: string, style: "long" | "short" = "long"): string {
  const text = (style === "long" ? longDate : shortDate).format(new Date(`${date}T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}
