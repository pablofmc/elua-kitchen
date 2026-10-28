import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { BatchSnapshot } from "@/lib/batches";
import { signPhotoUrls } from "@/lib/recipe-data";

type Client = SupabaseClient<Database>;
export type BatchStatus = Database["public"]["Enums"]["batch_status"];

export type Batch = {
  id: number;
  recipeId: number;
  recipeName: string;
  versionNumber: number;
  productionDate: string;
  status: BatchStatus;
  plannedPieces: number;
  actualPieces: number | null;
  snapshot: BatchSnapshot;
  rating: number | null;
  notes: string | null;
  photoPath: string | null;
  photoUrl: string | null;
  bakedAt: string | null;
  /** The latest process started from this batch, if any. */
  process: { id: number; status: Database["public"]["Enums"]["process_status"] } | null;
};

const COLUMNS =
  "id, recipe_name, production_date, status, planned_pieces, actual_pieces, snapshot, rating, notes, photo_path, baked_at, recipe_versions(version_number, recipe_id)";

type Row = Omit<Database["public"]["Tables"]["batches"]["Row"], "recipe_version_id" | "created_at" | "updated_at"> & {
  recipe_versions: { version_number: number; recipe_id: number };
};

function toBatch(row: Row, photoUrls: Map<string, string>): Batch {
  return {
    id: row.id,
    recipeId: row.recipe_versions.recipe_id,
    recipeName: row.recipe_name,
    versionNumber: row.recipe_versions.version_number,
    productionDate: row.production_date,
    status: row.status,
    plannedPieces: row.planned_pieces,
    actualPieces: row.actual_pieces,
    snapshot: row.snapshot as unknown as BatchSnapshot,
    rating: row.rating,
    notes: row.notes,
    photoPath: row.photo_path,
    photoUrl: row.photo_path ? photoUrls.get(row.photo_path) ?? null : null,
    bakedAt: row.baked_at,
    process: null,
  };
}

export async function loadBatch(supabase: Client, id: number): Promise<Batch | null> {
  const { data, error } = await supabase.from("batches").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Row;
  const [photoUrls, { data: runs, error: runsError }] = await Promise.all([
    signPhotoUrls(supabase, [row.photo_path]),
    supabase.from("process_runs").select("id, status").eq("batch_id", id).order("started_at", { ascending: false }).limit(1),
  ]);
  if (runsError) throw runsError;
  return { ...toBatch(row, photoUrls), process: runs[0] ?? null };
}

/** Newest production day first. */
export async function loadBatches(supabase: Client, { status, limit = 200 }: { status?: BatchStatus; limit?: number } = {}): Promise<Batch[]> {
  let query = supabase.from("batches").select(COLUMNS).order("production_date", { ascending: false }).order("id", { ascending: false }).limit(limit);
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  const rows = data as unknown as Row[];
  // Lists don't show photos; skip signing them.
  return rows.map((row) => toBatch(row, new Map()));
}

/**
 * Recipes worth a shortcut on Inicio: the ones in the latest batches first, then the most
 * recently edited, without repeats.
 */
export async function loadRecentRecipes(supabase: Client, limit = 4): Promise<{ id: number; name: string; category: Database["public"]["Enums"]["recipe_category"] }[]> {
  const [{ data: used, error: usedError }, { data: edited, error: editedError }] = await Promise.all([
    supabase.from("batches").select("recipe_versions(recipes(id, name, category))").order("created_at", { ascending: false }).limit(30),
    supabase.from("recipes").select("id, name, category").order("updated_at", { ascending: false }).limit(limit),
  ]);
  if (usedError) throw usedError;
  if (editedError) throw editedError;
  const fromBatches = (used as unknown as { recipe_versions: { recipes: { id: number; name: string; category: "dulce" | "salado" } } }[]).map((row) => row.recipe_versions.recipes);
  const seen = new Set<number>();
  return [...fromBatches, ...edited].filter((recipe) => !seen.has(recipe.id) && seen.add(recipe.id)).slice(0, limit);
}
