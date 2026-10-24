import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadCatalog, loadRecipeDetail } from "@/lib/recipe-data";
import { draftFromVersion } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import { RecipeForm } from "../../recipe-form";
import { updateRecipe } from "./actions";

export const metadata: Metadata = { title: "Editar receta" };

export default function EditarRecetaPage({ params }: PageProps<"/recetas/[id]/editar">) {
  return (
    <div className="space-y-6">
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando receta…</p>}>
        <EditRecipe params={params} />
      </Suspense>
    </div>
  );
}

async function EditRecipe({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [detail, ingredients] = await Promise.all([loadRecipeDetail(supabase, id), loadCatalog(supabase)]);
  if (!detail) notFound();
  const initial = draftFromVersion(detail.name, detail.category, { ...detail.recipe, steps: detail.steps });

  return (
    <>
      <div>
        <Link href={`/recetas/${id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-oscuro">
          ‹ {detail.name}
        </Link>
        <h1 className="text-2xl font-semibold">Editar receta</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Si cambias ingredientes, cantidades, piezas o pasos, se guarda como versión {detail.version.number + 1} y la versión{" "}
          {detail.version.number} se conserva. Cambiar solo el nombre, la categoría o la foto no crea versión.
        </p>
      </div>
      {/* Next keeps visited pages alive with their state; a new key starts the form over when the recipe changed. */}
      <RecipeForm
        key={JSON.stringify(initial)}
        action={updateRecipe.bind(null, id, detail.version.number)}
        ingredients={ingredients}
        initial={initial}
        submitLabel="Guardar cambios"
        withChangeNote
        withPhoto
      />
    </>
  );
}
