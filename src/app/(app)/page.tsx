import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { cardClass } from "@/components/ui";
import { loadBatches, loadRecentRecipes } from "@/lib/batch-data";
import { formatProductionDate } from "@/lib/batches";
import { CATEGORY_LABELS } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import { BatchRow } from "./lotes/batch-row";

export default function InicioPage() {
  return (
    <div className="space-y-8">
      <Link href="/calcular" className="block rounded-2xl bg-cafe-oscuro px-5 py-5 text-white shadow-sm hover:bg-tinta">
        <span className="block text-lg font-semibold">Calcular producción</span>
        <span className="text-sm text-crema">Por piezas, listo para pesar</span>
      </Link>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando…</p>}>
        <Recent />
      </Suspense>
    </div>
  );
}

const sectionTitle = "mb-3 text-sm font-semibold uppercase tracking-wide text-tinta-suave";

async function Recent() {
  const supabase = await createClient();
  const [recipes, batches] = await Promise.all([loadRecentRecipes(supabase), loadBatches(supabase, { limit: 3 })]);

  return (
    <>
      <section>
        <h2 className={sectionTitle}>Recetas recientes</h2>
        {recipes.length === 0 ? (
          <EmptyState title="Aún no hay recetas">
            <Link href="/recetas/nueva" className="font-semibold text-cafe-oscuro underline">Captura</Link> o{" "}
            <Link href="/recetas/importar" className="font-semibold text-cafe-oscuro underline">importa</Link> la primera.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <Link href={`/recetas/${recipe.id}`} className={`${cardClass} flex min-h-20 flex-col justify-between p-3 outline-cafe-oscuro hover:bg-crema-claro focus-visible:outline-2`}>
                  <span className="line-clamp-2 font-semibold">{recipe.name}</span>
                  <span className="text-xs text-tinta-suave">{CATEGORY_LABELS[recipe.category]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className={sectionTitle.replace("mb-3 ", "")}>Últimos lotes</h2>
          {batches.length > 0 ? <Link href="/lotes" className="text-sm font-semibold text-cafe-oscuro">Ver todos</Link> : null}
        </div>
        {batches.length === 0 ? (
          <EmptyState title="Aún no hay lotes">Guarda una producción desde Calcular para verla aquí.</EmptyState>
        ) : (
          <ul className={`${cardClass} divide-y divide-borde`}>
            {batches.map((batch) => (
              <li key={batch.id}>
                <BatchRow batch={batch} showDate={formatProductionDate(batch.productionDate, "short")} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
