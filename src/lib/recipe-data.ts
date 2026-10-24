import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { CalcRecipe } from "@/lib/calc";
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

export type VersionSummary = { id: number; number: number; baseYield: number; changeNote: string | null; createdAt: string };
export type StepView = { name: string; isManual: boolean; durationMinutes: number | null; repeats: number; intervalMinutes: number | null };
export type RecipeDetail = {
  id: number;
  name: string;
  category: Database["public"]["Enums"]["recipe_category"];
  photoUrl: string | null;
  photoPath: string | null;
  versions: VersionSummary[];
  version: VersionSummary;
  isCurrent: boolean;
  recipe: CalcRecipe;
  steps: StepView[];
};

/** A recipe at one version (the latest when `versionNumber` is omitted), ready for the calc library. */
export async function loadRecipeDetail(supabase: Client, recipeId: number, versionNumber?: number): Promise<RecipeDetail | null> {
  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("id, name, category, photo_path, recipe_versions(id, version_number, base_yield, change_note, created_at)")
    .eq("id", recipeId)
    .order("version_number", { referencedTable: "recipe_versions", ascending: false })
    .maybeSingle();
  if (error) throw error;
  if (!recipe || recipe.recipe_versions.length === 0) return null;

  const versions = recipe.recipe_versions.map((v) => ({
    id: v.id,
    number: v.version_number,
    baseYield: v.base_yield,
    changeNote: v.change_note,
    createdAt: v.created_at,
  }));
  const version = versionNumber === undefined ? versions[0] : versions.find((v) => v.number === versionNumber);
  if (!version) return null;

  const [{ data: parts, error: partsError }, { data: steps, error: stepsError }, photoUrls] = await Promise.all([
    supabase
      .from("recipe_components")
      .select("name, position, ingredient_lines(position, quantity, unit, counts_as_flour, ingredients(id, name, kind, grams_per_unit))")
      .eq("version_id", version.id)
      .order("position")
      .order("position", { referencedTable: "ingredient_lines" }),
    supabase
      .from("process_steps")
      .select("name, is_manual, duration_minutes, repeats, interval_minutes")
      .eq("version_id", version.id)
      .order("position"),
    signPhotoUrls(supabase, [recipe.photo_path]),
  ]);
  if (partsError) throw partsError;
  if (stepsError) throw stepsError;

  return {
    id: recipe.id,
    name: recipe.name,
    category: recipe.category,
    photoUrl: recipe.photo_path ? photoUrls.get(recipe.photo_path) ?? null : null,
    photoPath: recipe.photo_path,
    versions,
    version,
    isCurrent: version.number === versions[0].number,
    recipe: {
      baseYield: version.baseYield,
      components: parts.map((part) => ({
        name: part.name,
        lines: part.ingredient_lines.map((line) => ({
          ingredientId: line.ingredients.id,
          name: line.ingredients.name,
          kind: line.ingredients.kind,
          quantity: Number(line.quantity),
          unit: line.unit,
          gramsPerUnit: line.ingredients.grams_per_unit === null ? null : Number(line.ingredients.grams_per_unit),
          countsAsFlour: line.counts_as_flour,
        })),
      })),
    },
    steps: steps.map((step) => ({
      name: step.name,
      isManual: step.is_manual,
      durationMinutes: step.duration_minutes,
      repeats: step.repeats,
      intervalMinutes: step.interval_minutes,
    })),
  };
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
