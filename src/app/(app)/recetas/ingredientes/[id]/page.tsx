import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cardClass } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { updateIngredient } from "../actions";
import { IngredientForm } from "../ingredient-form";

export const metadata: Metadata = { title: "Editar ingrediente" };

export default function EditarIngredientePage({ params }: PageProps<"/recetas/ingredientes/[id]">) {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/recetas/ingredientes" className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-oscuro">
          ‹ Ingredientes
        </Link>
        <h1 className="text-2xl font-semibold">Editar ingrediente</h1>
      </div>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando…</p>}>
        <EditIngredient params={params} />
      </Suspense>
    </div>
  );
}

async function EditIngredient({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const { data } = await supabase
    .from("ingredients")
    .select("name, kind, default_unit, grams_per_unit")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className={`${cardClass} p-4`}>
      <IngredientForm action={updateIngredient.bind(null, id)} initial={data} submitLabel="Guardar cambios" idPrefix="edit" />
      <p className="mt-4 text-sm text-tinta-suave">
        Los cambios aplican a todas las recetas que usan este ingrediente. Los lotes guardados no cambian.
      </p>
    </div>
  );
}
