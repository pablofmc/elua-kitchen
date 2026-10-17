import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Lotes" };

export default function LotesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Lotes</h1>
      <EmptyState title="Aún no hay lotes">Las producciones que guardes quedarán aquí con su fecha y cantidades.</EmptyState>
    </div>
  );
}
