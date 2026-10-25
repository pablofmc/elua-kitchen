/**
 * How a process (proceso) moves through a recipe version's steps. Pure functions only.
 * Terms: GLOSSARY.md → Paso, Paso repetido, Proceso.
 *
 * Steps expand into slots. A timed step is one timer; a manual step waits for «Listo».
 * A repeated step (4 pliegues cada 30 min) is: fold 1 (Listo) → 30 min → fold 2 (Listo) → … → fold 4 (Listo).
 */

export type ProcessStep = { name: string; isManual: boolean; durationMinutes: number | null; repeats: number; intervalMinutes: number | null };

export type Slot =
  | { kind: "timer"; step: number; name: string; seconds: number }
  | { kind: "manual"; step: number; name: string; occurrence?: number; of?: number }
  /** The wait before the next occurrence of a repeated step. */
  | { kind: "wait"; step: number; name: string; seconds: number; next: number; of: number };

export function expandSteps(steps: ProcessStep[]): Slot[] {
  return steps.flatMap((step, index): Slot[] => {
    if (step.repeats > 1 && step.intervalMinutes) {
      return Array.from({ length: step.repeats }, (_, i): Slot[] => {
        const fold: Slot = { kind: "manual", step: index, name: step.name, occurrence: i + 1, of: step.repeats };
        if (i === step.repeats - 1) return [fold];
        return [fold, { kind: "wait", step: index, name: step.name, seconds: step.intervalMinutes! * 60, next: i + 2, of: step.repeats }];
      }).flat();
    }
    if (step.isManual || !step.durationMinutes) return [{ kind: "manual", step: index, name: step.name }];
    return [{ kind: "timer", step: index, name: step.name, seconds: step.durationMinutes * 60 }];
  });
}

/** One finished slot, for the record of when each step happened. */
export type LogEntry = { slot: number; startedAt: string; endedAt: string; skipped?: boolean };

/** What the database stores for a running process. Times are ISO strings. */
export type RunState = {
  status: "activo" | "terminado" | "cancelado";
  slotIndex: number;
  slotStartedAt: string;
  /** When the current timer ends; null for manual slots and while paused. */
  endsAt: string | null;
  /** Seconds left on a paused timer. */
  remainingSeconds: number | null;
  log: LogEntry[];
};

const iso = (ms: number) => new Date(ms).toISOString();

function enter(slots: Slot[], index: number, now: number, log: LogEntry[]): RunState {
  if (index >= slots.length) {
    return { status: "terminado", slotIndex: slots.length, slotStartedAt: iso(now), endsAt: null, remainingSeconds: null, log };
  }
  const slot = slots[index];
  return {
    status: "activo",
    slotIndex: index,
    slotStartedAt: iso(now),
    endsAt: slot.kind === "manual" ? null : iso(now + slot.seconds * 1000),
    remainingSeconds: null,
    log,
  };
}

export function startRun(slots: Slot[], now: number): RunState {
  return enter(slots, 0, now, []);
}

/** «Listo» on a manual slot, or «Seguir» once a timer is done (or early). */
export function advance(state: RunState, slots: Slot[], now: number): RunState {
  if (state.status !== "activo") return state;
  const log = [...state.log, { slot: state.slotIndex, startedAt: state.slotStartedAt, endedAt: iso(now) }];
  return enter(slots, state.slotIndex + 1, now, log);
}

/**
 * «Listo» while waiting between repetitions: the fold is done, so the wait ends and the fold is
 * recorded in one tap, and the wait before the next fold starts.
 */
export function completeFold(state: RunState, slots: Slot[], now: number): RunState {
  if (state.status !== "activo" || slots[state.slotIndex]?.kind !== "wait") return advance(state, slots, now);
  return advance(advance(state, slots, now), slots, now);
}

/** Skips what's left of the current step, every repetition included. */
export function skipStep(state: RunState, slots: Slot[], now: number): RunState {
  if (state.status !== "activo") return state;
  const step = slots[state.slotIndex].step;
  let next = state.slotIndex + 1;
  while (next < slots.length && slots[next].step === step) next++;
  const log = [...state.log, { slot: state.slotIndex, startedAt: state.slotStartedAt, endedAt: iso(now), skipped: true }];
  return enter(slots, next, now, log);
}

export function pause(state: RunState, now: number): RunState {
  if (state.status !== "activo" || state.endsAt === null) return state;
  const left = Math.max(0, Math.ceil((Date.parse(state.endsAt) - now) / 1000));
  if (left === 0) return state;
  return { ...state, endsAt: null, remainingSeconds: left };
}

export function resume(state: RunState, now: number): RunState {
  if (state.status !== "activo" || state.remainingSeconds === null) return state;
  return { ...state, endsAt: iso(now + state.remainingSeconds * 1000), remainingSeconds: null };
}

export const EXTEND_SECONDS = 10 * 60;

/** +10 min. On a finished timer it starts a fresh 10 minutes from now. */
export function extend(state: RunState, slots: Slot[], now: number): RunState {
  if (state.status !== "activo" || slots[state.slotIndex]?.kind === "manual") return state;
  if (state.remainingSeconds !== null) return { ...state, remainingSeconds: state.remainingSeconds + EXTEND_SECONDS };
  if (state.endsAt === null) return state;
  return { ...state, endsAt: iso(Math.max(Date.parse(state.endsAt), now) + EXTEND_SECONDS * 1000) };
}

export function cancel(state: RunState, now: number): RunState {
  if (state.status !== "activo") return state;
  return { ...state, status: "cancelado", endsAt: null, remainingSeconds: null, slotStartedAt: iso(now) };
}

/** Seconds left on the current timer, 0 when it's done, null for manual slots. */
export function secondsLeft(state: RunState, now: number): number | null {
  if (state.remainingSeconds !== null) return state.remainingSeconds;
  if (state.endsAt === null) return null;
  return Math.max(0, Math.ceil((Date.parse(state.endsAt) - now) / 1000));
}

/** What the screen and the notification call a slot: "Pliegues · 2 de 4", "Fermentación". */
export function slotTitle(slot: Slot): string {
  if (slot.kind === "wait") return `${slot.name} · ${slot.next} de ${slot.of}`;
  if (slot.kind === "manual" && slot.occurrence) return `${slot.name} · ${slot.occurrence} de ${slot.of}`;
  return slot.name;
}

/** The notification when a timer runs out. */
export function doneMessage(slot: Slot): string {
  return slot.kind === "wait" ? `Hora de ${slotTitle(slot)}` : `Terminó ${slot.name}`;
}

/** 5400 → "1:30:00", 125 → "2:05". */
export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
