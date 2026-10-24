import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cardClass } from "@/components/ui";
import { KIND_LABELS, UNIT_SHORT } from "@/lib/ingredients";
import { createClient } from "@/lib/supabase/server";
import { createIngredient } from "./actions";
import { IngredientForm } from "./ingredient-form";

export const metadata: Metadata = { title: "Ingredientes" };

export default function IngredientesPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/recetas" className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-oscuro">
          ‹ Recetas
        </Link>
        <h1 className="text-2xl font-semibold">Ingredientes</h1>
        <p className="mt-1 text-sm text-tinta-suave">Todas las recetas eligen de esta lista, así cada ingrediente se escribe una sola vez.</p>
      </div>

      <details className={`${cardClass} group`}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-semibold text-cafe-oscuro">
          Agregar ingrediente
          <span aria-hidden className="text-xl transition-transform group-open:rotate-45">+</span>
        </summary>
        <div className="border-t border-borde p-4">
          <IngredientForm action={createIngredient} submitLabel="Agregar" idPrefix="new" />
        </div>
      </details>

      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando ingredientes…</p>}>
        <IngredientList />
      </Suspense>
    </div>
  );
}

async function IngredientList() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, name, kind, default_unit, grams_per_unit")
    .order("name");

  if (error) return <p role="alert" className="text-sm">No se pudieron cargar los ingredientes.</p>;
  if (data.length === 0) {
    return <p className="text-sm text-tinta-suave">Aún no hay ingredientes. Agrega el primero arriba.</p>;
  }

  return (
    <ul className={`${cardClass} divide-y divide-borde`}>
      {data.map((ingredient) => (
        <li key={ingredient.id}>
          <Link
            href={`/recetas/ingredientes/${ingredient.id}`}
            className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 outline-cafe-oscuro hover:bg-crema-claro focus-visible:outline-2"
          >
            <span className="font-medium">{ingredient.name}</span>
            <span className="text-right text-sm text-tinta-suave">
              {KIND_LABELS[ingredient.kind]} ·{" "}
              {ingredient.default_unit === "unidad"
                ? `${Number(ingredient.grams_per_unit).toLocaleString("es-MX")} g por unidad`
                : UNIT_SHORT[ingredient.default_unit]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
