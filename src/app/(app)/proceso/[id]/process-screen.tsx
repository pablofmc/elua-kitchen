"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { FieldError } from "@/components/field-error";
import { cardClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import { useClock } from "@/components/use-clock";
import { formatCountdown, secondsLeft, slotTitle, type Slot } from "@/lib/process";
import type { ProcessRun } from "@/lib/process-data";
import { moveProcess, type Move } from "../actions";
import { PushToggle } from "../push-toggle";

const timeFormat = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" });

function minutesLabel(seconds: number) {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function stepLabel(slot: Slot) {
  return slot.kind === "timer" ? `${slot.name} · ${minutesLabel(slot.seconds)}` : slotTitle(slot);
}

/** What happens after the current slot, in a few words. */
function nextLabel(slots: Slot[], index: number) {
  const slot = slots[index];
  if (slot.kind === "wait") {
    // Waiting for a fold: say what comes after that fold.
    const after = slots[index + 2];
    if (!after) return `Después del pliegue ${slot.next} termina el proceso.`;
    if (after.kind === "wait") return `Después del pliegue ${slot.next}, otros ${minutesLabel(after.seconds)} hasta el ${after.next} de ${after.of}.`;
    return `Después del pliegue ${slot.next} sigue: ${stepLabel(after)}`;
  }
  const next = slots[index + 1];
  if (!next) return "Es el último paso.";
  if (next.kind === "wait") return `Luego, ${minutesLabel(next.seconds)} hasta ${slotTitle(next)}`;
  return `Sigue: ${stepLabel(next)}`;
}

export function ProcessScreen({ run, serverNow }: { run: ProcessRun; serverNow: number }) {
  const now = useClock(serverNow);
  const [pending, startMove] = useTransition();
  const [message, setMessage] = useState<string>();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { state, slots } = run;
  const slot = state.status === "activo" ? slots[state.slotIndex] : undefined;
  const left = secondsLeft(state, now);
  const paused = state.remainingSeconds !== null;
  const done = slot !== undefined && slot.kind !== "manual" && !paused && left === 0;

  useAlarm(done, run.id, state.slotIndex);

  function move(kind: Move) {
    setMessage(undefined);
    startMove(async () => {
      const result = await moveProcess(run.id, run.updatedAt, kind);
      if (!result.ok) setMessage(result.message);
    });
  }

  const totalSteps = new Set(slots.map((item) => item.step)).size;

  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">{run.recipeName}</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Versión {run.versionNumber} · iniciado a las {timeFormat.format(new Date(run.startedAt))}
        </p>
      </header>

      {slot ? (
        <section className={`${cardClass} space-y-4 p-5 ${done ? "border-coral bg-coral/15" : ""}`} aria-live="polite">
          <p className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
            Paso {slot.step + 1} de {totalSteps}
          </p>
          <h2 className="text-2xl font-extrabold">
            {slot.kind === "wait" ? (done ? `Hora de ${slotTitle(slot)}` : `Siguiente: ${slotTitle(slot)}`) : slotTitle(slot)}
          </h2>

          {slot.kind === "manual" ? (
            <p className="text-tinta-suave">{slot.occurrence ? "Haz el pliegue y toca Listo." : "Sin tiempo: toca Listo cuando termines."}</p>
          ) : (
            <p className="text-6xl font-extrabold tabular-nums tracking-tight" role="timer">
              {done ? "¡Ya!" : formatCountdown(left ?? 0)}
              {paused ? <span className="ml-3 align-middle text-base font-bold text-tinta-suave">En pausa</span> : null}
            </p>
          )}
          <p className="text-sm text-tinta-suave">{nextLabel(slots, state.slotIndex)}</p>

          <div className="grid grid-cols-2 gap-2">
            {slot.kind === "manual" ? (
              <button type="button" disabled={pending} onClick={() => move("advance")} className={`${primaryButtonClass} col-span-2 min-h-14 text-lg`}>
                Listo
              </button>
            ) : null}
            {slot.kind === "wait" ? (
              <button type="button" disabled={pending} onClick={() => move("fold")} className={`${primaryButtonClass} col-span-2 min-h-14 text-lg`}>
                Listo, pliegue {slot.next} hecho
              </button>
            ) : null}
            {slot.kind === "timer" && done ? (
              <button type="button" disabled={pending} onClick={() => move("advance")} className={`${primaryButtonClass} col-span-2 min-h-14 text-lg`}>
                {slots[state.slotIndex + 1] ? `Seguir: ${slotTitle(slots[state.slotIndex + 1])}` : "Terminar proceso"}
              </button>
            ) : null}
            {slot.kind !== "manual" && paused ? (
              <button type="button" disabled={pending} onClick={() => move("resume")} className={`${primaryButtonClass} min-h-12`}>
                Reanudar
              </button>
            ) : null}
            {slot.kind !== "manual" && !paused && !done ? (
              <button type="button" disabled={pending} onClick={() => move("pause")} className={`${secondaryButtonClass} min-h-12`}>
                Pausar
              </button>
            ) : null}
            {slot.kind !== "manual" ? (
              <button type="button" disabled={pending} onClick={() => move("extend")} className={`${secondaryButtonClass} min-h-12`}>
                +10 min
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-x-6">
            {slot.kind === "timer" && !done ? (
              <button type="button" disabled={pending} onClick={() => move("advance")} className="min-h-11 text-sm font-semibold text-cafe-oscuro underline">
                Terminar este paso ya
              </button>
            ) : null}
            <button type="button" disabled={pending} onClick={() => move("skip")} className="min-h-11 text-sm font-semibold text-cafe-oscuro underline">
              Omitir {(slot.kind === "manual" && slot.occurrence) || slot.kind === "wait" ? "los pliegues que faltan" : "este paso"}
            </button>
          </div>
          <FieldError id="move-error" message={message} />
        </section>
      ) : (
        <section className={`${cardClass} space-y-2 p-5`}>
          <h2 className="text-2xl font-extrabold">{state.status === "terminado" ? "Proceso terminado" : "Proceso cancelado"}</h2>
          <p className="text-sm text-tinta-suave">
            {state.status === "terminado" ? "Terminó" : "Se canceló"} a las {timeFormat.format(new Date(state.slotStartedAt))}.
          </p>
          <Link href={`/recetas/${run.recipeId}`} className="inline-flex min-h-11 items-center font-semibold text-cafe-oscuro underline">
            Ver la receta
          </Link>
        </section>
      )}

      {state.status === "activo" ? <PushToggle /> : null}

      <StepList run={run} />

      {state.status === "activo" ? (
        <div className="space-y-2">
          {confirmCancel ? (
            <div className={`${cardClass} space-y-3 p-4`} role="alertdialog" aria-labelledby="cancel-title">
              <p id="cancel-title" className="font-semibold">¿Cancelar este proceso? No se puede deshacer.</p>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmCancel(false)} className={secondaryButtonClass}>
                  No, seguir
                </button>
                <button type="button" disabled={pending} onClick={() => move("cancel")} className={primaryButtonClass}>
                  Sí, cancelar
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmCancel(true)} className="min-h-11 text-sm font-semibold text-tinta-suave underline">
              Cancelar proceso
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

/** Every step with what happened to it: done at what time, skipped, now, or still to come. */
function StepList({ run }: { run: ProcessRun }) {
  const { state, slots } = run;
  const steps = [...new Set(slots.map((slot) => slot.step))];
  const current = state.status === "activo" ? slots[state.slotIndex]?.step : undefined;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Pasos</h2>
      <ol className={`${cardClass} divide-y divide-borde`}>
        {steps.map((step) => {
          const own = slots.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.step === step);
          const first = own[0].slot;
          const entries = state.log.filter((entry) => own.some(({ index }) => index === entry.slot));
          const skipped = entries.some((entry) => entry.skipped);
          const finished = own.every(({ index }) => index < state.slotIndex) || (state.status === "terminado");
          const folds = first.kind === "manual" && first.of ? `${own.filter(({ slot, index }) => slot.kind === "manual" && index < state.slotIndex).length} de ${first.of}` : null;
          const isCurrent = step === current;
          const label = skipped
            ? "Omitido"
            : finished && entries.length
              ? `Listo · ${timeFormat.format(new Date(entries.at(-1)!.endedAt))}`
              : isCurrent
                ? folds ?? "Ahora"
                : first.kind === "timer"
                  ? minutesLabel(first.seconds)
                  : first.kind === "manual" && first.of
                    ? `${first.of} veces`
                    : "Manual";
          return (
            <li key={step} aria-current={isCurrent ? "step" : undefined} className={`flex items-baseline justify-between gap-3 px-4 py-3 ${isCurrent ? "bg-crema" : ""}`}>
              <span className={`font-medium ${finished && !isCurrent ? "text-tinta-suave line-through decoration-1" : ""}`}>{first.name}</span>
              <span className={`text-right text-sm tabular-nums ${isCurrent ? "font-bold" : "text-tinta-suave"}`}>{label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Beeps and vibrates once when the current timer reaches zero while the screen is open. */
function useAlarm(done: boolean, runId: number, slotIndex: number) {
  const rang = useRef<string | null>(null);
  useEffect(() => {
    const key = `${runId}:${slotIndex}`;
    if (!done || rang.current === key) return;
    rang.current = key;
    // Browsers only allow vibration after a tap on the page.
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.([400, 200, 400, 200, 400]);
    try {
      const audio = new AudioContext();
      [0, 0.45, 0.9].forEach((at) => {
        const tone = audio.createOscillator();
        const gain = audio.createGain();
        tone.frequency.value = 880;
        gain.gain.setValueAtTime(0.25, audio.currentTime + at);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + at + 0.35);
        tone.connect(gain).connect(audio.destination);
        tone.start(audio.currentTime + at);
        tone.stop(audio.currentTime + at + 0.4);
      });
      setTimeout(() => audio.close(), 2000);
    } catch {
      // No sound available: the screen still shows «¡Ya!».
    }
  }, [done, runId, slotIndex]);
}
