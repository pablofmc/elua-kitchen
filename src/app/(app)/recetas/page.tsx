import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Recetas" };

export default function RecetasPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Recetas</h1>
      <EmptyState title="Aún no hay recetas">Crea una receta o impórtala desde un texto o una foto.</EmptyState>
    </div>
  );
}
