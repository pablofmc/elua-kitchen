import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ScaledList } from "@/components/scaled-list";
import { secondaryButtonClass } from "@/components/ui";
import { loadBatch } from "@/lib/batch-data";
import { formatProductionDate } from "@/lib/batches";
import { formatFactor, formatList } from "@/lib/calc/format";
import { createClient } from "@/lib/supabase/server";
import { StatusChip } from "../status-chip";
import { StartProcessButton } from "../../recetas/[id]/start-process-button";
import { BakeSection } from "./bake-section";
import { BatchActions } from "./batch-actions";

export const metadata: Metadata = { title: "Lote" };

export default function LotePage({ params }: PageProps<"/lotes/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/lotes" className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-oscuro">
        ‹ Lotes
      </Link>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando lote…</p>}>
        <BatchDetail params={params} />
      </Suspense>
    </div>
  );
}

async function BatchDetail({ params }: Pick<PageProps<"/lotes/[id]">, "params">) {
  const supabase = await createClient();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const batch = await loadBatch(supabase, id);
  if (!batch) notFound();
  const { snapshot } = batch;
  const baked = batch.status === "horneado";

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        <p className="text-sm font-semibold text-tinta-suave">{formatProductionDate(batch.productionDate)}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{batch.recipeName}</h1>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <StatusChip status={batch.status} />
          <span className="rounded-full border border-borde bg-white px-3 py-1">
            {batch.plannedPieces} {batch.plannedPieces === 1 ? "pieza planeada" : "piezas planeadas"}
            {baked && batch.actualPieces !== null ? ` · ${batch.actualPieces} reales` : ""}
          </span>
          <Link href={`/recetas/${batch.recipeId}?version=${batch.versionNumber}`} className="rounded-full border border-borde bg-white px-3 py-1 text-cafe-oscuro underline-offset-2 hover:underline">
            Versión {batch.versionNumber} · {formatFactor(snapshot.factor)}
          </Link>
        </div>
      </header>

      <BakeSection
        id={batch.id}
        status={batch.status}
        plannedPieces={batch.plannedPieces}
        actualPieces={batch.actualPieces}
        rating={batch.rating}
        notes={batch.notes}
        photoUrl={batch.photoUrl}
        bakedAt={batch.bakedAt}
      />

      <div className="grid grid-cols-2 gap-2">
        {batch.process ? (
          <Link href={`/proceso/${batch.process.id}`} className={`${secondaryButtonClass} col-span-2`}>
            {batch.process.status === "activo" ? "Ver el proceso en marcha" : "Ver cómo fue el proceso"}
          </Link>
        ) : (
          <StartProcessButton recipeId={batch.recipeId} batchId={batch.id} hasSteps />
        )}
      </div>

      <ScaledList recipe={snapshot.recipe} />
      <p className="-mt-3 text-xs text-tinta-suave">
        Cantidades guardadas el día del cálculo. Si la receta cambia después, este lote no cambia.
      </p>

      <BatchActions id={batch.id} status={batch.status} copyText={formatList(batch.recipeName, { ...snapshot.recipe, factor: snapshot.factor })} />
    </article>
  );
}
