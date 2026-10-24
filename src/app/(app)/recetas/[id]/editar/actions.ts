"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadCatalog, loadRecipeDetail, uploadRecipePhoto } from "@/lib/recipe-data";
import { draftFromVersion, toJson, validateRecipeDraft, versionChanged, type RecipeDraft } from "@/lib/recipes";
import { createActionClient } from "@/lib/supabase/auth";
import type { RecipeFormState } from "../../recipe-form";

const STALE_VERSION = "EL409";

/**
 * Saves an edited recipe. Name, category and photo change in place; anything that affects a
 * calculation becomes a new version. `expectedVersion` is the version the form was opened on.
 */
export async function updateRecipe(recipeId: number, expectedVersion: number, _prev: RecipeFormState, formData: FormData): Promise<RecipeFormState> {
  let draft: RecipeDraft;
  try {
    draft = JSON.parse(String(formData.get("draft")));
  } catch {
    return { status: "error", message: "No se pudo leer la receta. Recarga la página e intenta de nuevo." };
  }

  const supabase = await createActionClient();
  const [catalog, current] = await Promise.all([loadCatalog(supabase), loadRecipeDetail(supabase, recipeId)]);
  if (!current) return { status: "error", message: "Esta receta ya no existe." };

  const checked = validateRecipeDraft(draft, catalog);
  if ("errors" in checked) return { status: "error", errors: checked.errors };
  const saved = validateRecipeDraft(draftFromVersion(current.name, current.category, { ...current.recipe, steps: current.steps }), catalog);
  const { payload } = checked;
  const newVersion = !("payload" in saved) || versionChanged(saved.payload.version, payload.version);

  const photo = await uploadRecipePhoto(supabase, formData.get("photo"));
  if ("error" in photo) return { status: "error", errors: { photo: photo.error } };

  const { error } = await supabase.rpc("update_recipe", {
    p_recipe_id: recipeId,
    p_expected_version: expectedVersion,
    p_name: payload.name,
    p_category: payload.category,
    p_photo_path: photo.path ?? current.photoPath ?? undefined,
    p_version: newVersion ? toJson(payload.version) : undefined,
  });
  if (error) {
    if (photo.path) await supabase.storage.from("recipe-photos").remove([photo.path]);
    return {
      status: "error",
      message:
        error.code === STALE_VERSION
          ? "Alguien guardó esta receta mientras la editabas. Recarga la página para ver la versión nueva."
          : "No se pudo guardar. Intenta de nuevo.",
    };
  }
  if (photo.path && current.photoPath) await supabase.storage.from("recipe-photos").remove([current.photoPath]);

  // Drop prefetched copies of the recipe pages, the edit form and Calcular so nothing shows the old version.
  revalidatePath("/", "layout");
  redirect(`/recetas/${recipeId}`);
}
