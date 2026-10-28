"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { advance, cancel, completeFold, extend, pause, resume, skipStep, startRun, expandSteps } from "@/lib/process";
import { loadBatch } from "@/lib/batch-data";
import { loadRun, stateColumns } from "@/lib/process-data";
import { loadRecipeDetail } from "@/lib/recipe-data";
import { createActionClient } from "@/lib/supabase/auth";

/**
 * Starts a process and opens it: on the recipe's current version, or, from a batch, on the version
 * that batch was calculated with.
 */
export async function startProcess(recipeId: number, batchId?: number): Promise<{ error: string }> {
  const supabase = await createActionClient();
  const batch = batchId === undefined ? null : await loadBatch(supabase, batchId);
  if (batchId !== undefined && !batch) return { error: "Este lote ya no existe." };
  const detail = await loadRecipeDetail(supabase, batch?.recipeId ?? recipeId, batch?.versionNumber);
  if (!detail) return { error: "Esta receta ya no existe." };
  const slots = expandSteps(detail.steps);
  if (slots.length === 0) return { error: "Esta receta no tiene pasos. Agrégalos en Editar." };

  const { data, error } = await supabase
    .from("process_runs")
    .insert({ recipe_version_id: detail.version.id, batch_id: batch?.id ?? null, ...stateColumns(startRun(slots, Date.now())) })
    .select("id")
    .single();
  if (error) return { error: "No se pudo iniciar. Intenta de nuevo." };

  revalidatePath("/", "layout");
  redirect(`/proceso/${data.id}`);
}

export type Move = "advance" | "fold" | "skip" | "pause" | "resume" | "extend" | "cancel";
export type MoveResult = { ok: true } | { ok: false; message: string };

const MOVES = { advance, fold: completeFold, skip: skipStep, extend } as const;

/**
 * Applies one move to a process. `updatedAt` is when the screen last saw it: if someone moved it
 * meanwhile (another phone), nothing changes and the screen reloads.
 */
export async function moveProcess(id: number, updatedAt: string, move: Move): Promise<MoveResult> {
  const supabase = await createActionClient();
  const run = await loadRun(supabase, id);
  if (!run) return { ok: false, message: "Este proceso ya no existe." };
  if (run.updatedAt !== updatedAt) {
    revalidatePath("/", "layout");
    return { ok: false, message: "Este proceso cambió en otro celular. Ya se actualizó." };
  }

  const now = Date.now();
  const next =
    move === "pause" ? pause(run.state, now)
    : move === "resume" ? resume(run.state, now)
    : move === "cancel" ? cancel(run.state, now)
    : MOVES[move](run.state, run.slots, now);
  if (next === run.state) return { ok: true };

  const { data, error } = await supabase
    .from("process_runs")
    .update(stateColumns(next))
    .eq("id", id)
    .eq("updated_at", updatedAt)
    .select("id");
  if (error) return { ok: false, message: "No se pudo guardar. Intenta de nuevo." };
  revalidatePath("/", "layout");
  if (data.length === 0) return { ok: false, message: "Este proceso cambió en otro celular. Ya se actualizó." };
  return { ok: true };
}
