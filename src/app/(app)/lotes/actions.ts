"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parsePieces } from "@/lib/calc";
import { makeSnapshot, parseProductionDate } from "@/lib/batches";
import { loadRecipeDetail } from "@/lib/recipe-data";
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

/** Removes a planned batch. Baked batches are history and RLS keeps them. */
export async function deleteBatch(id: number): Promise<{ error: string }> {
  const supabase = await createActionClient();
  const { data, error } = await supabase.from("batches").delete().eq("id", id).eq("status", "planeado").select("id");
  if (error || data.length === 0) return { error: "No se pudo eliminar. Un lote horneado no se puede eliminar." };
  revalidatePath("/", "layout");
  redirect("/lotes");
}
