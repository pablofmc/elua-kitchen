import type { Unit } from "@/lib/ingredients";
import { lineGrams } from "./index";

const whole = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("es-MX", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** ≥ 100 → whole number, < 100 → one decimal. es-MX: 1,750 · 34.6 */
export function formatAmount(value: number): string {
  return value >= 100 ? whole.format(Math.round(value)) : oneDecimal.format(value);
}

export function formatGrams(grams: number): string {
  return `${formatAmount(grams)} g`;
}

/** Unit ingredients are always whole: nearest whole, .5 rounds up, never below 1. */
export function wholeUnits(count: number): number {
  return Math.max(1, Math.round(count));
}

function plural(name: string, count: number) {
  const word = name.toLowerCase();
  if (count === 1) return word;
  return /[aeiouáéíóú]$/.test(word) ? `${word}s` : `${word}es`;
}

/** How a line reads on screen: "1,750 g", "260 ml" or "3 huevos (≈ 150 g)". */
export function formatQuantity(line: { name: string; quantity: number; unit: Unit; gramsPerUnit: number | null }): string {
  if (line.unit === "unidad") {
    const count = wholeUnits(line.quantity);
    // The weight is only a guide (eggs vary), so it reads as whole grams.
    return `${count} ${plural(line.name, count)} (≈ ${whole.format(Math.round(lineGrams({ ...line, quantity: count })))} g)`;
  }
  return `${formatAmount(line.quantity)} ${line.unit}`;
}

/** 0.6623 → "66.2 %" */
export function formatPercent(fraction: number): string {
  return `${oneDecimal.format(fraction * 100)} %`;
}
