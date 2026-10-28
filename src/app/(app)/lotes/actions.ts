"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parsePieces } from "@/lib/calc";
import { makeSnapshot, parseProductionDate } from "@/lib/batches";
import { loadBatch } from "@/lib/batch-data";
import { loadRecipeDetail, uploadRecipePhoto } from "@/lib/recipe-data";
import { createActionClient } from "@/lib/supabase/auth";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Saves a planned batch. The quantities are calculated here from the recipe's current version,
 * not taken from the browser, and stored as a fixed copy.
 */
export async function saveBatch(recipeId: number, rawPieces: number, rawDate: string): Promise<{ error: string }> {
  const pieces = parsePieces(rawPieces);
  const date = parseProductionDate(rawDate);
  if (pieces === null) return { error: "Escribe cuántas piezas." };
  if (date === null) return { error: "Elige una fecha válida." };

  const supabase = await createActionClient();
  const detail = await loadRecipeDetail(supabase, recipeId);
  if (!detail) return { error: "Esta receta ya no existe." };

  const { data, error } = await supabase
    .from("batches")
    .insert({
      recipe_version_id: detail.version.id,
      recipe_name: detail.name,
      production_date: date,
      planned_pieces: pieces,
      snapshot: makeSnapshot(detail.recipe, pieces) as unknown as NonNullable<Json>,
    })
    .select("id")
    .single();
  if (error) return { error: "No se pudo guardar el lote. Intenta de nuevo." };

  revalidatePath("/", "layout");
  redirect(`/lotes/${data.id}`);
}

export type BakeState = { error?: string; errors?: Partial<Record<"actual_pieces" | "rating" | "notes" | "photo", string>>; saves: number };

/**
 * Marks a batch as baked, or edits what was recorded: real pieces, rating, notes and photo.
 * The calculated quantities stay as they were.
 */
export async function recordBake(id: number, prev: BakeState, formData: FormData): Promise<BakeState> {
  const errors: BakeState["errors"] = {};
  const piecesRaw = String(formData.get("actual_pieces") ?? "").trim();
  const actualPieces = Number(piecesRaw);
  if (piecesRaw === "" || !Number.isInteger(actualPieces) || actualPieces < 0 || actualPieces > 9999) errors.actual_pieces = "Escribe cuántas piezas salieron (0 o más).";
  const ratingRaw = String(formData.get("rating") ?? "");
  const rating = ratingRaw === "" ? null : Number(ratingRaw);
  if (rating !== null && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) errors.rating = "Elige de 1 a 5.";
  const notes = String(formData.get("notes") ?? "").trim();
  if (notes.length > 2000) errors.notes = "Máximo 2,000 caracteres.";
  if (Object.keys(errors).length > 0) return { errors, saves: prev.saves };

  const supabase = await createActionClient();
  const batch = await loadBatch(supabase, id);
  if (!batch) return { error: "Este lote ya no existe.", saves: prev.saves };

  const photo = await uploadRecipePhoto(supabase, formData.get("photo"));
  if ("error" in photo) return { errors: { photo: photo.error }, saves: prev.saves };

  const { error } = await supabase
    .from("batches")
    .update({
      status: "horneado",
      actual_pieces: actualPieces,
      rating,
      notes: notes || null,
      photo_path: photo.path ?? batch.photoPath,
      baked_at: batch.bakedAt ?? new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    if (photo.path) await supabase.storage.from("recipe-photos").remove([photo.path]);
    return { error: "No se pudo guardar. Intenta de nuevo.", saves: prev.saves };
  }
  if (photo.path && batch.photoPath) await supabase.storage.from("recipe-photos").remove([batch.photoPath]);

  revalidatePath("/", "layout");
  return { saves: prev.saves + 1 };
}

/** Removes a planned batch. Baked batches are history and RLS keeps them. */
export async function deleteBatch(id: number): Promise<{ error: string }> {
  const supabase = await createActionClient();
  const { data, error } = await supabase.from("batches").delete().eq("id", id).eq("status", "planeado").select("id");
  if (error || data.length === 0) return { error: "No se pudo eliminar. Un lote horneado no se puede eliminar." };
  revalidatePath("/", "layout");
  redirect("/lotes");
}
