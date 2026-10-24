import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { loadRecipeSummaries } from "@/lib/recipe-data";
import { createClient } from "@/lib/supabase/server";
import { RecipeList } from "./recipe-list";

export const metadata: Metadata = { title: "Recetas" };

export default function RecetasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Recetas</h1>
        <Link href="/recetas/ingredientes" className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-oscuro">
          Ingredientes
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Link href="/recetas/nueva" className={primaryButtonClass}>
          Nueva receta
        </Link>
        <button type="button" disabled aria-describedby="import-soon" className={secondaryButtonClass}>
          Importar
        </button>
        <p id="import-soon" className="col-span-2 -mt-1 text-xs text-tinta-suave">Importar desde texto o foto llega pronto.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando recetas…</p>}>
        <Recipes />
      </Suspense>
    </div>
  );
}

async function Recipes() {
  const supabase = await createClient();
  const recipes = await loadRecipeSummaries(supabase);
  if (recipes.length === 0) {
    return <EmptyState title="Aún no hay recetas">Toca «Nueva receta» para capturar la primera.</EmptyState>;
  }
  return <RecipeList recipes={recipes} />;
}
