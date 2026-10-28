import Link from "next/link";
import type { Batch } from "@/lib/batch-data";
import { StatusChip } from "./status-chip";

/** «30 piezas» while planned, «30 → 28 piezas» once baked. */
export function piecesLabel(batch: Pick<Batch, "plannedPieces" | "actualPieces" | "status">) {
  const unit = (n: number) => (n === 1 ? "pieza" : "piezas");
  if (batch.status === "horneado" && batch.actualPieces !== null && batch.actualPieces !== batch.plannedPieces) {
    return `${batch.plannedPieces} → ${batch.actualPieces} ${unit(batch.actualPieces)}`;
  }
  return `${batch.plannedPieces} ${unit(batch.plannedPieces)}`;
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-sm tracking-tight text-cafe-oscuro" aria-label={`${rating} de 5`}>
      {"★".repeat(rating)}
      <span className="text-borde">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function BatchRow({ batch, showDate }: { batch: Batch; showDate?: string }) {
  return (
    <Link href={`/lotes/${batch.id}`} className="flex min-h-16 items-center justify-between gap-3 px-4 py-3 outline-cafe-oscuro hover:bg-crema-claro focus-visible:outline-2">
      <span className="min-w-0">
        <span className="block truncate font-semibold">{batch.recipeName}</span>
        <span className="block text-sm text-tinta-suave tabular-nums">
          {showDate ? `${showDate} · ` : ""}
          {piecesLabel(batch)}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1 text-sm font-semibold">
        <StatusChip status={batch.status} />
        {batch.rating ? <Stars rating={batch.rating} /> : null}
      </span>
    </Link>
  );
}
