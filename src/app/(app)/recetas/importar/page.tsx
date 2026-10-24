import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { loadCatalog } from "@/lib/recipe-data";
import { createClient } from "@/lib/supabase/server";
import { ImportFlow } from "./import-flow";

export const metadata: Metadata = { title: "Importar receta" };

export default function ImportarRecetaPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/recetas" className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-oscuro">
          ‹ Recetas
        </Link>
        <h1 className="text-2xl font-semibold">Importar receta</h1>
        <p className="mt-1 text-sm text-tinta-suave">Pega el texto o toma una foto: la IA llena el formulario y tú lo revisas antes de guardar.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando ingredientes…</p>}>
        <Import />
      </Suspense>
    </div>
  );
}

async function Import() {
  const supabase = await createClient();
  const [ingredients, { data: latest }] = await Promise.all([
    loadCatalog(supabase),
    supabase.from("recipes").select("id").order("id", { ascending: false }).limit(1).maybeSingle(),
  ]);
  // Next keeps visited pages alive with their state; a new recipe starts the next visit over.
  return <ImportFlow key={latest?.id ?? 0} ingredients={ingredients} />;
}
