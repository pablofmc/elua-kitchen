"use client";

import Link from "next/link";
import { useClock } from "@/components/use-clock";
import { formatCountdown, secondsLeft, slotTitle, type RunState, type Slot } from "@/lib/process";

type RunSummary = { id: number; recipeName: string; state: RunState; slots: Slot[] };

/** "Fermentación · 1:23:45", "Formado · toca Listo" or "¡Terminó Autólisis!". */
export function runStatus(run: RunSummary, now: number): { text: string; due: boolean } {
  const { state, slots } = run;
  if (state.status === "terminado") return { text: "Terminado", due: false };
  if (state.status === "cancelado") return { text: "Cancelado", due: false };
  const slot = slots[state.slotIndex];
  const left = secondsLeft(state, now);
  if (slot.kind === "manual") return { text: `${slotTitle(slot)} · toca Listo`, due: true };
  if (state.remainingSeconds !== null) return { text: `${slotTitle(slot)} · en pausa`, due: false };
  if (left === 0) return { text: slot.kind === "wait" ? `Hora de ${slotTitle(slot)}` : `¡Terminó ${slot.name}!`, due: true };
  const countdown = formatCountdown(left ?? 0);
  return { text: slot.kind === "wait" ? `${slotTitle(slot)} en ${countdown}` : `${slot.name} · ${countdown}`, due: false };
}

export function RunLine({ run, serverNow }: { run: RunSummary; serverNow: number }) {
  const now = useClock(serverNow);
  const status = runStatus(run, now);
  return (
    <Link href={`/proceso/${run.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 outline-cafe-oscuro hover:bg-crema-claro focus-visible:outline-2">
      <span className="min-w-0 font-semibold">{run.recipeName}</span>
      <span className={`text-right text-sm tabular-nums ${status.due ? "font-bold text-tinta" : "text-tinta-suave"}`}>{status.text}</span>
    </Link>
  );
}
