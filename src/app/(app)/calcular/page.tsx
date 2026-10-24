import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Calcular" };

export default function CalcularPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Calcular</h1>
      <EmptyState title="Primero necesitas una receta">Con una receta guardada podrás calcular cualquier producción por número de piezas.</EmptyState>
    </div>
  );
}
