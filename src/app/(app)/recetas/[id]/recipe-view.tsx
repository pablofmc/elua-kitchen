"use client";

import { useState } from "react";
import { cardClass } from "@/components/ui";
import { bakersPercent, hydration, totalGrams, type CalcRecipe } from "@/lib/calc";
import { formatGrams, formatPercent, formatQuantity } from "@/lib/calc/format";

type Mode = "gramos" | "porcentaje";

/** Ingredients by component, in grams or baker's percentages, plus the hydration summary. */
export function RecipeView({ recipe }: { recipe: CalcRecipe }) {
  const [mode, setMode] = useState<Mode>("gramos");
  const water = hydration(recipe);
  const canShowPercent = water !== null;
  const showPercent = canShowPercent && mode === "porcentaje";
  const several = recipe.components.length > 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Ingredientes</h2>
        {canShowPercent ? (
          <div role="group" aria-label="Ver en" className="grid grid-cols-2 gap-1 rounded-xl bg-crema p-1">
            {(["gramos", "porcentaje"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                onClick={() => setMode(option)}
                className={`min-h-10 whitespace-nowrap rounded-lg px-3 text-sm outline-cafe-oscuro focus-visible:outline-2 ${
                  mode === option ? "bg-white font-bold text-tinta shadow-sm" : "font-semibold text-tinta-suave"
                }`}
              >
                {option === "gramos" ? "Gramos" : "% panadero"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        {recipe.components.map((component) => (
          <div key={component.name}>
            {several ? (
              <h3 className="bg-crema px-4 py-2 text-xs font-bold uppercase tracking-wider">{component.name}</h3>
            ) : null}
            <ul className="divide-y divide-borde">
              {component.lines.map((line, index) => (
                <li key={`${line.ingredientId}-${index}`} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <span className="font-medium">{line.name}</span>
                  <span className="text-right text-lg font-bold tabular-nums">
                    {showPercent && water ? formatPercent(bakersPercent(line, water.addedFlour)) : formatQuantity(line)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-3 border-t border-borde bg-crema px-4 py-3 text-sm font-semibold">
          <span>Total, antes de hornear</span>
          <span className="tabular-nums">{formatGrams(totalGrams(recipe))}</span>
        </div>
      </div>
      {showPercent ? <p className="text-sm text-tinta-suave">Porcentajes sobre la harina añadida ({formatGrams(water!.addedFlour)}).</p> : null}

      {water && (water.addedWater > 0 || water.starter > 0) ? (
        <dl className={`${cardClass} grid grid-cols-2 gap-x-4 gap-y-3 p-4`}>
          <div className="col-span-2">
            <dt className="text-sm text-tinta-suave">Hidratación real</dt>
            <dd className="text-3xl font-extrabold tabular-nums">{formatPercent(water.trueHydration)}</dd>
            {water.starter > 0 ? <dd className="text-xs text-tinta-suave">Cuenta la harina y el agua de la masa madre (al 100 %).</dd> : null}
          </div>
          <div>
            <dt className="text-sm text-tinta-suave">Sobre harina añadida</dt>
            <dd className="font-bold tabular-nums">{formatPercent(water.hydrationOverAddedFlour)}</dd>
          </div>
          <div>
            <dt className="text-sm text-tinta-suave">Harina total</dt>
            <dd className="font-bold tabular-nums">{formatGrams(water.totalFlour)}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
