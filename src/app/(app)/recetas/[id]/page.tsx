import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { loadRecipeDetail, type StepView } from "@/lib/recipe-data";
import { CATEGORY_LABELS } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import { RecipeView } from "./recipe-view";

export const metadata: Metadata = { title: "Receta" };

export default function RecetaPage({ params, searchParams }: PageProps<"/recetas/[id]">) {
  return (
    <div className="space-y-6">
      <Link href="/recetas" className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-oscuro">
        ‹ Recetas
      </Link>
      <Suspense fallback={<p className="text-sm text-tinta-suave">Cargando receta…</p>}>
        <Recipe params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const dateFormat = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });

async function Recipe({ params, searchParams }: Pick<PageProps<"/recetas/[id]">, "params" | "searchParams">) {
  const supabase = await createClient();
  const id = Number((await params).id);
  const versionParam = (await searchParams).version;
  const versionNumber = typeof versionParam === "string" ? Number(versionParam) : undefined;
  if (!Number.isInteger(id) || (versionNumber !== undefined && !Number.isInteger(versionNumber))) notFound();

  const detail = await loadRecipeDetail(supabase, id, versionNumber);
  if (!detail) notFound();
  const pieces = detail.version.baseYield;

  return (
    <article className="space-y-6">
      <header className="space-y-3">
        {detail.photoUrl ? (
          <Image src={detail.photoUrl} alt={detail.name} width={720} height={405} unoptimized className="aspect-video w-full rounded-2xl object-cover" />
        ) : null}
        <h1 className="text-3xl font-extrabold tracking-tight">{detail.name}</h1>
        <div className="flex flex-wrap gap-2 text-sm font-semibold">
          <span className={`rounded-full px-3 py-1 ${detail.category === "dulce" ? "bg-crema" : "bg-celeste/40"}`}>{CATEGORY_LABELS[detail.category]}</span>
          <span className="rounded-full border border-borde bg-white px-3 py-1">
            Rinde {pieces} {pieces === 1 ? "pieza" : "piezas"}
          </span>
          <span className="rounded-full border border-borde bg-white px-3 py-1">
            Versión {detail.version.number} · {dateFormat.format(new Date(detail.version.createdAt))}
          </span>
        </div>
        {!detail.isCurrent ? (
          <p role="status" className="rounded-xl bg-coral/30 px-4 py-3 text-sm">
            Estás viendo una versión anterior.{" "}
            <Link href={`/recetas/${detail.id}`} className="font-semibold text-cafe-oscuro underline">Ver la actual</Link>
          </p>
        ) : null}
      </header>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled aria-describedby="coming-next" className={primaryButtonClass}>Calcular</button>
        <button type="button" disabled aria-describedby="coming-next" className={secondaryButtonClass}>Iniciar proceso</button>
        <p id="coming-next" className="col-span-2 -mt-1 text-xs text-tinta-suave">Calcular e Iniciar proceso llegan en los siguientes hitos.</p>
      </div>

      <RecipeView recipe={detail.recipe} />

      {detail.steps.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Proceso</h2>
          <ol className={`${cardClass} divide-y divide-borde`}>
            {detail.steps.map((step, index) => (
              <li key={index} className="flex items-baseline justify-between gap-3 px-4 py-3">
                <span className="font-medium">{step.name}</span>
                <span className="text-right text-sm text-tinta-suave tabular-nums">{describeStep(step)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}

function minutes(total: number) {
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function describeStep(step: StepView) {
  if (step.isManual || step.durationMinutes === null) return "Manual";
  if (step.repeats > 1 && step.intervalMinutes !== null) return `${step.repeats} × cada ${minutes(step.intervalMinutes)}`;
  return minutes(step.durationMinutes);
}
