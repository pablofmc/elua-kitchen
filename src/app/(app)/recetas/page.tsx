import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { primaryButtonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Recetas" };

export default function RecetasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Recetas</h1>
        <Link href="/recetas/ingredientes" className="inline-flex min-h-11 items-center text-sm font-semibold text-cafe-oscuro">
          Ingredientes
        </Link>
      </div>
      <Link href="/recetas/nueva" className={`${primaryButtonClass} w-full`}>
        Nueva receta
      </Link>
      <EmptyState title="Aún no hay recetas">Crea una receta o impórtala desde un texto o una foto.</EmptyState>
    </div>
  );
}
