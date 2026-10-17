import Link from "next/link";
import { EmptyState } from "@/components/empty-state";

export default function InicioPage() {
  return (
    <div className="space-y-8">
      <Link
        href="/calcular"
        className="block rounded-2xl bg-cafe-oscuro px-5 py-5 text-white shadow-sm hover:bg-tinta"
      >
        <span className="block text-lg font-semibold">Calcular producción</span>
        <span className="text-sm text-crema">Piezas y peso, listo para pesar</span>
      </Link>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tinta-suave">Recetas recientes</h2>
        <EmptyState title="Aún no hay recetas">Cuando guardes o importes recetas, las más usadas aparecerán aquí.</EmptyState>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-tinta-suave">Últimos lotes</h2>
        <EmptyState title="Aún no hay lotes">Guarda una producción calculada para verla aquí.</EmptyState>
      </section>
    </div>
  );
}
