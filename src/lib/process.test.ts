import { describe, expect, it } from "vitest";
import {
  advance,
  cancel,
  completeFold,
  doneMessage,
  expandSteps,
  extend,
  formatCountdown,
  pause,
  resume,
  secondsLeft,
  skipStep,
  slotTitle,
  startRun,
  type ProcessStep,
} from "./process";

const step = (name: string, extra: Partial<ProcessStep> = {}): ProcessStep => ({ name, isManual: false, durationMinutes: null, repeats: 1, intervalMinutes: null, ...extra });

// The plan's example loaf.
const loaf = expandSteps([
  step("Autólisis", { durationMinutes: 30 }),
  step("Pliegues", { durationMinutes: 5, repeats: 4, intervalMinutes: 30 }),
  step("Fermentación", { durationMinutes: 180 }),
  step("Formado", { isManual: true }),
  step("Reposo", { durationMinutes: 720 }),
]);

const T0 = Date.parse("2026-10-25T08:00:00Z");
const min = (m: number) => T0 + m * 60_000;

describe("expandSteps", () => {
  it("turns a repeated step into folds with waits between them", () => {
    expect(loaf.map(slotTitle)).toEqual([
      "Autólisis",
      "Pliegues · 1 de 4",
      "Pliegues · 2 de 4",
      "Pliegues · 2 de 4",
      "Pliegues · 3 de 4",
      "Pliegues · 3 de 4",
      "Pliegues · 4 de 4",
      "Pliegues · 4 de 4",
      "Fermentación",
      "Formado",
      "Reposo",
    ]);
    expect(loaf.map((slot) => slot.kind)).toEqual(["timer", "manual", "wait", "manual", "wait", "manual", "wait", "manual", "timer", "manual", "timer"]);
    expect(loaf[2]).toMatchObject({ kind: "wait", seconds: 1800, next: 2 });
  });

  it("treats a timed step without minutes as manual", () => {
    expect(expandSteps([step("Amasar")])).toEqual([{ kind: "manual", step: 0, name: "Amasar" }]);
  });
});

describe("running a process", () => {
  it("starts on the first timer and records each step", () => {
    let run = startRun(loaf, T0);
    expect(run).toMatchObject({ status: "activo", slotIndex: 0, endsAt: new Date(min(30)).toISOString() });
    expect(secondsLeft(run, min(10))).toBe(1200);
    expect(secondsLeft(run, min(31))).toBe(0);

    run = advance(run, loaf, min(31)); // autólisis done → fold 1 waits for Listo
    expect(run).toMatchObject({ slotIndex: 1, endsAt: null });
    expect(secondsLeft(run, min(31))).toBeNull();
    run = advance(run, loaf, min(33)); // Listo on fold 1 → 30 min until fold 2
    expect(run.endsAt).toBe(new Date(min(63)).toISOString());
    expect(doneMessage(loaf[run.slotIndex])).toBe("Hora de Pliegues · 2 de 4");
    expect(run.log).toEqual([
      { slot: 0, startedAt: new Date(T0).toISOString(), endedAt: new Date(min(31)).toISOString() },
      { slot: 1, startedAt: new Date(min(31)).toISOString(), endedAt: new Date(min(33)).toISOString() },
    ]);
  });

  it("does a fold in one tap while waiting for it", () => {
    let run = advance(advance(startRun(loaf, T0), loaf, min(30)), loaf, min(31)); // waiting for fold 2
    run = completeFold(run, loaf, min(61));
    expect(loaf[run.slotIndex]).toMatchObject({ kind: "wait", next: 3 });
    expect(run.endsAt).toBe(new Date(min(91)).toISOString());
    expect(run.log.map((entry) => entry.slot)).toEqual([0, 1, 2, 3]);
  });

  it("finishes after the last step", () => {
    let run = startRun(loaf, T0);
    for (let i = 0; i < loaf.length; i++) run = advance(run, loaf, min(i));
    expect(run.status).toBe("terminado");
    expect(advance(run, loaf, min(99))).toBe(run);
  });

  it("skips every repetition left in a step", () => {
    let run = advance(startRun(loaf, T0), loaf, min(30)); // on fold 1
    run = skipStep(run, loaf, min(31));
    expect(slotTitle(loaf[run.slotIndex])).toBe("Fermentación");
    expect(run.log.at(-1)).toMatchObject({ slot: 1, skipped: true });
  });

  it("pauses, resumes and extends", () => {
    let run = startRun(loaf, T0); // 30 min
    run = pause(run, min(10));
    expect(run).toMatchObject({ endsAt: null, remainingSeconds: 1200 });
    expect(secondsLeft(run, min(50))).toBe(1200);
    run = extend(run, loaf, min(50));
    expect(run.remainingSeconds).toBe(1800);
    run = resume(run, min(50));
    expect(run.endsAt).toBe(new Date(min(80)).toISOString());
    run = extend(run, loaf, min(60));
    expect(run.endsAt).toBe(new Date(min(90)).toISOString());
  });

  it("extends a finished timer from now", () => {
    const run = extend(startRun(loaf, T0), loaf, min(45));
    expect(run.endsAt).toBe(new Date(min(55)).toISOString());
  });

  it("doesn't pause or extend a manual step", () => {
    const run = advance(startRun(loaf, T0), loaf, min(30));
    expect(pause(run, min(31))).toBe(run);
    expect(extend(run, loaf, min(31))).toBe(run);
  });

  it("cancels", () => {
    expect(cancel(startRun(loaf, T0), min(5))).toMatchObject({ status: "cancelado", endsAt: null });
  });
});

describe("formatCountdown", () => {
  it("shows hours only when there are any", () => {
    expect(formatCountdown(5400)).toBe("1:30:00");
    expect(formatCountdown(125)).toBe("2:05");
    expect(formatCountdown(0)).toBe("0:00");
  });
});
