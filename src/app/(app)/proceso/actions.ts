"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { advance, cancel, completeFold, extend, pause, resume, skipStep, startRun, expandSteps } from "@/lib/process";
import { loadRun, stateColumns } from "@/lib/process-data";
import { loadRecipeDetail } from "@/lib/recipe-data";
import { createActionClient } from "@/lib/supabase/auth";

/** Starts a process on the recipe's current version and opens it. */
export async function startProcess(recipeId: number): Promise<{ error: string }> {
  const supabase = await createActionClient();
  const detail = await loadRecipeDetail(supabase, recipeId);
  if (!detail) return { error: "Esta receta ya no existe." };
  const slots = expandSteps(detail.steps);
  if (slots.length === 0) return { error: "Esta receta no tiene pasos. Agrégalos en Editar." };

  const { data, error } = await supabase
    .from("process_runs")
    .insert({ recipe_version_id: detail.version.id, ...stateColumns(startRun(slots, Date.now())) })
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
