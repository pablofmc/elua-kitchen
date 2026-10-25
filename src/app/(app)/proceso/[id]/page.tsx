import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadRun, serverTime } from "@/lib/process-data";
import { createClient } from "@/lib/supabase/server";
import { ProcessScreen } from "./process-screen";

export const metadata: Metadata = { title: "Proceso" };

export default function ProcesoPage({ params }: PageProps<"/proceso/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/proceso" className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-oscuro">
        ‹ Procesos
      </Link>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando proceso…</p>}>
        <Process params={params} />
      </Suspense>
    </div>
  );
}

async function Process({ params }: Pick<PageProps<"/proceso/[id]">, "params">) {
  const supabase = await createClient();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const run = await loadRun(supabase, id);
  if (!run) notFound();
  return <ProcessScreen run={run} serverNow={serverTime()} />;
}
