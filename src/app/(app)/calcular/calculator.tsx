"use client";

import Link from "next/link";
import { useState } from "react";
import { cardClass, primaryButtonClass } from "@/components/ui";
import { MAX_PIECES, parsePieces, scaleRecipe, totalGrams, type CalcRecipe } from "@/lib/calc";
import { formatFactor, formatGrams, formatQuantity } from "@/lib/calc/format";
import { CATEGORY_LABELS, type RecipeCategory } from "@/lib/recipes";

type Option = { id: number; name: string; category: RecipeCategory };
type Selected = { id: number; name: string; recipe: CalcRecipe; initialPieces: number };

/** One recipe, how many pieces, and every ingredient scaled and ready to weigh. */
export function Calculator({ recipes, selected }: { recipes: Option[]; selected: Selected | null }) {
  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="mb-2 text-sm font-bold">Receta</legend>
        <ul className="flex flex-wrap gap-2">
          {recipes.map((option) => {
            const on = option.id === selected?.id;
            return (
              <li key={option.id}>
                <Link
                  href={`/calcular?receta=${option.id}`}
                  replace
                  scroll={false}
                  aria-current={on ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center rounded-full px-4 text-[15px] outline-cafe-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 ${
                    on ? "bg-tinta font-bold text-white" : "border border-borde bg-white font-semibold text-tinta hover:bg-crema-claro"
                  }`}
                >
                  {option.name}
                  <span className="sr-only"> ({CATEGORY_LABELS[option.category]})</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {selected ? <Result key={`${selected.id}-${selected.initialPieces}`} selected={selected} /> : <p className="text-sm text-tinta-suave">Elige la receta que vas a producir.</p>}
    </div>
  );
}

function Result({ selected }: { selected: Selected }) {
  const [typed, setTyped] = useState(String(selected.initialPieces));
  const [pieces, setPieces] = useState(selected.initialPieces);
  const scaled = scaleRecipe(selected.recipe, pieces);
  const several = scaled.components.length > 1;

  function choose(next: number | null, text?: string) {
    setTyped(text ?? (next === null ? "" : String(next)));
    if (next === null) return;
    setPieces(next);
    // Keeps the choice in the address, so back, reload and sharing land on the same calculation.
    window.history.replaceState(null, "", `/calcular?receta=${selected.id}&piezas=${next}`);
  }

  return (
    <div className="space-y-6">
      <div className={`${cardClass} flex items-center gap-3 p-4`}>
        <div className="min-w-0 flex-1">
          <label htmlFor="pieces" className="block text-[17px] font-bold">¿Cuántas piezas?</label>
          <p className="text-sm text-tinta-suave">
            La receta rinde {selected.recipe.baseYield} · {formatFactor(scaled.factor)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => choose(Math.max(1, pieces - 1))}
            disabled={pieces <= 1}
            aria-label="Una pieza menos"
            className="flex size-11 items-center justify-center rounded-xl border border-borde bg-crema-claro text-2xl font-bold text-cafe-oscuro outline-cafe-oscuro focus-visible:outline-2 disabled:opacity-40"
          >
            −
          </button>
          <input
            id="pieces"
            inputMode="numeric"
            value={typed}
            onChange={(event) => choose(parsePieces(event.target.value), event.target.value)}
            onBlur={() => setTyped(String(pieces))}
            maxLength={String(MAX_PIECES).length + 1}
            className="w-16 rounded-lg border border-transparent bg-transparent py-1 text-center text-2xl font-extrabold tabular-nums outline-none focus:border-cafe-oscuro focus:bg-white"
          />
          <button
            type="button"
            onClick={() => choose(Math.min(MAX_PIECES, pieces + 1))}
            disabled={pieces >= MAX_PIECES}
            aria-label="Una pieza más"
            className="flex size-11 items-center justify-center rounded-xl bg-cafe-oscuro text-2xl font-bold text-white outline-cafe-oscuro focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <section className="space-y-3" aria-live="polite">
        <h2 className="text-xl font-extrabold">Para pesar</h2>
        <div className={`${cardClass} overflow-hidden`}>
          {scaled.components.map((component, c) => (
            <div key={c}>
              {several ? <h3 className="bg-crema px-4 py-2 text-xs font-bold uppercase tracking-wider">{component.name}</h3> : null}
              <ul className="divide-y divide-borde">
                {component.lines.map((line, l) => (
                  <li key={l} className="flex items-baseline justify-between gap-3 px-4 py-3">
                    <span className="font-medium">{line.name}</span>
                    <span className="text-right text-xl font-extrabold tabular-nums">{formatQuantity(line)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-3 border-t border-borde bg-crema px-4 py-3">
            <span className="text-sm font-bold">Total, antes de hornear</span>
            <span className="font-extrabold tabular-nums">{formatGrams(totalGrams(scaled))}</span>
          </div>
        </div>
      </section>

      <div className="space-y-1">
        <button type="button" disabled aria-describedby="batch-soon" className={`${primaryButtonClass} w-full`}>
          Guardar lote
        </button>
        <p id="batch-soon" className="text-xs text-tinta-suave">Guardar como lote llega en el siguiente hito.</p>
      </div>
    </div>
  );
}
