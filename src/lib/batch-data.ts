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
  };
}

export async function loadBatch(supabase: Client, id: number): Promise<Batch | null> {
  const { data, error } = await supabase.from("batches").select(COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Row;
  return toBatch(row, await signPhotoUrls(supabase, [row.photo_path]));
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
