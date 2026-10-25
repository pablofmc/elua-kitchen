"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClock } from "@/components/use-clock";
import { secondsLeft, type RunState, type Slot } from "@/lib/process";
import { runStatus } from "./run-line";

type RunSummary = { id: number; recipeName: string; state: RunState; slots: Slot[] };

/** Seconds until a process needs attention; 0 when it already does. */
function urgency(run: RunSummary, now: number) {
  if (run.slots[run.state.slotIndex]?.kind === "manual") return 0;
  if (run.state.remainingSeconds !== null) return Infinity;
  return secondsLeft(run.state, now) ?? 0;
}

/** On every screen: the process that needs attention soonest, and how many are running. */
export function ProcessBannerView({ runs, serverNow }: { runs: RunSummary[]; serverNow: number }) {
  const now = useClock(serverNow);
  const pathname = usePathname();
  if (runs.length === 0 || pathname.startsWith("/proceso")) return null;

  const first = [...runs].sort((a, b) => urgency(a, now) - urgency(b, now))[0];
  const status = runStatus(first, now);
  const others = runs.length - 1;

  return (
    <Link
      href={others > 0 ? "/proceso" : `/proceso/${first.id}`}
      className={`mb-6 flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 py-3 outline-cafe-oscuro focus-visible:outline-2 ${
        status.due ? "bg-coral/40" : "bg-celeste/40"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{status.text}</span>
        <span className="block truncate text-xs text-tinta-suave">
          {first.recipeName}
          {others > 0 ? ` · y ${others} ${others === 1 ? "proceso más" : "procesos más"}` : ""}
        </span>
      </span>
      <span aria-hidden className="text-lg font-bold text-cafe-oscuro">›</span>
    </Link>
  );
}
