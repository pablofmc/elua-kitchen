import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/empty-state";
import { cardClass } from "@/components/ui";
import { loadRuns, serverTime } from "@/lib/process-data";
import { createClient } from "@/lib/supabase/server";
import { RunLine } from "./run-line";

export const metadata: Metadata = { title: "Procesos" };

export default function ProcesosPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Procesos</h1>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando procesos…</p>}>
        <Runs />
      </Suspense>
    </div>
  );
}

async function Runs() {
  const supabase = await createClient();
  const runs = await loadRuns(supabase, { withRecent: true });
  const serverNow = serverTime();
  const active = runs.filter((run) => run.state.status === "activo");
  const recent = runs.filter((run) => run.state.status !== "activo");

  if (runs.length === 0) {
    return (
      <EmptyState title="No hay procesos en marcha">
        Abre una receta y toca «Iniciar proceso». <Link href="/recetas" className="font-semibold text-cafe-oscuro underline">Ver recetas</Link>
      </EmptyState>
    );
  }

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">En marcha</h2>
        {active.length === 0 ? <p className="text-sm text-tinta-suave">Ninguno ahora.</p> : null}
        <ul className={`${cardClass} divide-y divide-borde ${active.length === 0 ? "hidden" : ""}`}>
          {active.map((run) => (
            <li key={run.id}>
              <RunLine run={run} serverNow={serverNow} />
            </li>
          ))}
        </ul>
      </section>
      {recent.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Últimas 24 horas</h2>
          <ul className={`${cardClass} divide-y divide-borde`}>
            {recent.map((run) => (
              <li key={run.id}>
                <RunLine run={run} serverNow={serverNow} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
