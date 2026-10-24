import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { parsePieces } from "@/lib/calc";
import { loadRecipeDetail, loadRecipeSummaries } from "@/lib/recipe-data";
import { createClient } from "@/lib/supabase/server";
import { Calculator } from "./calculator";

export const metadata: Metadata = { title: "Calcular" };

export default function CalcularPage({ searchParams }: PageProps<"/calcular">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Calcular</h1>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando recetas…</p>}>
        <CalculatorData searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CalculatorData({ searchParams }: Pick<PageProps<"/calcular">, "searchParams">) {
  const supabase = await createClient();
  const params = await searchParams;
  const recipes = await loadRecipeSummaries(supabase);
  if (recipes.length === 0) {
    return (
      <EmptyState title="Primero necesitas una receta">
        Con una receta guardada podrás calcular cualquier producción por número de piezas.{" "}
        <Link href="/recetas/nueva" className="font-semibold text-cafe-oscuro underline">Crear una receta</Link>
      </EmptyState>
    );
  }

  const options = recipes.map(({ id, name, category }) => ({ id, name, category }));
  const wanted = Number(params.receta);
  const chosen = recipes.find((recipe) => recipe.id === wanted);
  // Calculations always use the current version.
  const detail = chosen ? await loadRecipeDetail(supabase, chosen.id) : null;
  if (!detail) return <Calculator recipes={options} selected={null} />;

  const pieces = parsePieces(typeof params.piezas === "string" ? params.piezas : null) ?? detail.version.baseYield;
  return (
    <Calculator
      key={detail.id}
      recipes={options}
      selected={{ id: detail.id, name: detail.name, recipe: detail.recipe, initialPieces: pieces }}
    />
  );
}
