import { cardClass } from "@/components/ui";
import { componentGrams, totalGrams, type CalcRecipe } from "@/lib/calc";
import { formatGrams, formatQuantity } from "@/lib/calc/format";

/** «Para pesar»: scaled quantities by part, each part's weight and the total. Used by Calcular and saved batches. */
export function ScaledList({ recipe, title = "Para pesar" }: { recipe: CalcRecipe; title?: string }) {
  const several = recipe.components.length > 1;
  return (
  <section className="space-y-3" aria-live="polite">
    <h2 className="text-xl font-extrabold">{title}</h2>
    <div className={`${cardClass} overflow-hidden`}>
      {recipe.components.map((component, c) => (
        <div key={c}>
          {several ? (
            <h3 className="flex items-baseline justify-between gap-3 bg-crema px-4 py-2 text-xs font-bold uppercase tracking-wider">
              <span>{component.name}</span>
              <span className="text-sm normal-case tracking-normal tabular-nums">{formatGrams(componentGrams(component))}</span>
            </h3>
          ) : null}
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
        <span className="font-extrabold tabular-nums">{formatGrams(totalGrams(recipe))}</span>
      </div>
    </div>
  </section>
  );
}
