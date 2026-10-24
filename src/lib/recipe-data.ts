import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CatalogIngredient } from "@/app/(app)/recetas/recipe-form";
import type { RecipeSummary } from "@/app/(app)/recetas/recipe-list";

type Client = SupabaseClient<Database>;

/** The ingredient catalog as the recipe form needs it. */
export async function loadCatalog(supabase: Client): Promise<CatalogIngredient[]> {
  const { data, error } = await supabase.from("ingredients").select("id, name, kind, default_unit, grams_per_unit").order("name");
  if (error) throw error;
  return data;
}

/** Every recipe with its current (latest) version, alphabetical, with short-lived photo links. */
export async function loadRecipeSummaries(supabase: Client): Promise<RecipeSummary[]> {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, name, category, photo_path, recipe_versions(version_number, base_yield)")
    .order("name")
    .order("version_number", { referencedTable: "recipe_versions", ascending: false })
    .limit(1, { referencedTable: "recipe_versions" });
  if (error) throw error;

  const photoUrls = await signPhotoUrls(supabase, data.map((recipe) => recipe.photo_path));
  return data.flatMap((recipe) => {
    const current = recipe.recipe_versions[0];
    if (!current) return [];
    return [
      {
        id: recipe.id,
        name: recipe.name,
        category: recipe.category,
        baseYield: current.base_yield,
        version: current.version_number,
        photoUrl: recipe.photo_path ? photoUrls.get(recipe.photo_path) ?? null : null,
      },
    ];
  });
}

/** Signed links for private recipe photos, valid for an hour. */
export async function signPhotoUrls(supabase: Client, paths: (string | null)[]): Promise<Map<string, string>> {
  const wanted = paths.filter((path): path is string => Boolean(path));
  if (wanted.length === 0) return new Map();
  const { data } = await supabase.storage.from("recipe-photos").createSignedUrls(wanted, 60 * 60);
  return new Map((data ?? []).flatMap((item) => (item.path && item.signedUrl ? [[item.path, item.signedUrl] as const] : [])));
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
