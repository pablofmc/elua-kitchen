import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { loadCatalog } from "@/lib/recipe-data";
import { createClient } from "@/lib/supabase/server";
import { emptyDraft } from "@/lib/recipes";
import { RecipeForm } from "../recipe-form";
import { createRecipe } from "./actions";

export const metadata: Metadata = { title: "Nueva receta" };

export default function NuevaRecetaPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/recetas" className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-oscuro">
          ‹ Recetas
        </Link>
        <h1 className="text-2xl font-semibold">Nueva receta</h1>
        <p className="mt-1 text-sm text-tinta-suave">Escribe las cantidades en gramos, tal como la receta rinde hoy.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando ingredientes…</p>}>
        <NewRecipeForm />
      </Suspense>
    </div>
  );
}

async function NewRecipeForm() {
  const supabase = await createClient();
  const [ingredients, { data: latest }] = await Promise.all([
    loadCatalog(supabase),
    supabase.from("recipes").select("id").order("id", { ascending: false }).limit(1).maybeSingle(),
  ]);
  // Next keeps visited pages alive with their state. Keying on the newest recipe empties the form
  // after a save, so the next visit doesn't start from the recipe that was just created.
  return (
    <RecipeForm
      key={latest?.id ?? 0}
      action={createRecipe}
      ingredients={ingredients}
      initial={emptyDraft()}
      submitLabel="Guardar receta"
      withPhoto
    />
  );
}
