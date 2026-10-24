import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CatalogIngredient } from "@/app/(app)/recetas/recipe-form";

type Client = SupabaseClient<Database>;

/** The ingredient catalog as the recipe form needs it. */
export async function loadCatalog(supabase: Client): Promise<CatalogIngredient[]> {
  const { data, error } = await supabase.from("ingredients").select("id, name, kind, default_unit, grams_per_unit").order("name");
  if (error) throw error;
  return data;
}

const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/** Uploads an optional recipe photo. Returns its storage path, null when none was sent, or an error message. */
export async function uploadRecipePhoto(supabase: Client, file: FormDataEntryValue | null): Promise<{ path: string | null } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { path: null };
  const extension = PHOTO_TYPES[file.type];
  if (!extension) return { error: "La foto debe ser JPG, PNG, WebP o HEIC." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "La foto pesa más de 5 MB." };

  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("recipe-photos").upload(path, file, { contentType: file.type });
  if (error) return { error: "No se pudo subir la foto. Intenta de nuevo." };
  return { path };
}
