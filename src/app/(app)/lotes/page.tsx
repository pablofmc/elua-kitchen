import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { cardClass } from "@/components/ui";
import { loadBatches, type BatchStatus } from "@/lib/batch-data";
import { formatProductionDate } from "@/lib/batches";
import { createClient } from "@/lib/supabase/server";
import { BatchRow } from "./batch-row";

export const metadata: Metadata = { title: "Lotes" };

const FILTERS: { label: string; status?: BatchStatus }[] = [{ label: "Todos" }, { label: "Planeados", status: "planeado" }, { label: "Horneados", status: "horneado" }];

export default function LotesPage({ searchParams }: PageProps<"/lotes">) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Lotes</h1>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando lotes…</p>}>
        <History searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function History({ searchParams }: Pick<PageProps<"/lotes">, "searchParams">) {
  const { estado } = await searchParams;
  const status = estado === "planeado" || estado === "horneado" ? estado : undefined;
  const supabase = await createClient();
  const batches = await loadBatches(supabase, { status });

  // Production days, newest first, each with its batches.
  const days = new Map<string, typeof batches>();
  for (const batch of batches) days.set(batch.productionDate, [...(days.get(batch.productionDate) ?? []), batch]);

  return (
    <>
      <nav aria-label="Filtrar por estado" className="grid grid-cols-3 gap-1 rounded-xl bg-crema p-1">
        {FILTERS.map((filter) => {
          const on = filter.status === status;
          return (
            <Link
              key={filter.label}
              href={filter.status ? `/lotes?estado=${filter.status}` : "/lotes"}
              replace
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-10 items-center justify-center rounded-lg text-sm outline-cafe-oscuro focus-visible:outline-2 ${on ? "bg-white font-bold text-tinta shadow-sm" : "font-semibold text-tinta-suave"}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>

      {batches.length === 0 ? (
        <EmptyState title={status ? `No hay lotes ${status === "planeado" ? "planeados" : "horneados"}` : "Aún no hay lotes"}>
          En Calcular, elige una receta y cuántas piezas, y toca «Guardar lote». <Link href="/calcular" className="font-semibold text-cafe-oscuro underline">Ir a Calcular</Link>
        </EmptyState>
      ) : (
        [...days].map(([day, list]) => (
          <section key={day} className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-tinta-suave">{formatProductionDate(day)}</h2>
            <ul className={`${cardClass} divide-y divide-borde`}>
              {list.map((batch) => (
                <li key={batch.id}>
                  <BatchRow batch={batch} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
