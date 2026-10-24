"use server";

import { redirect } from "next/navigation";
import { loadCatalog, uploadRecipePhoto } from "@/lib/recipe-data";
import { toJson, validateRecipeDraft, type RecipeDraft } from "@/lib/recipes";
import { createActionClient } from "@/lib/supabase/auth";
import type { RecipeFormState } from "../recipe-form";

export async function createRecipe(_prev: RecipeFormState, formData: FormData): Promise<RecipeFormState> {
  let draft: RecipeDraft;
  try {
    draft = JSON.parse(String(formData.get("draft")));
  } catch {
    return { status: "error", message: "No se pudo leer la receta. Recarga la página e intenta de nuevo." };
  }

  const supabase = await createActionClient();
  const checked = validateRecipeDraft(draft, await loadCatalog(supabase));
  if ("errors" in checked) return { status: "error", errors: checked.errors };

  const photo = await uploadRecipePhoto(supabase, formData.get("photo"));
  if ("error" in photo) return { status: "error", errors: { photo: photo.error } };

  const { payload } = checked;
  const { data: recipeId, error } = await supabase.rpc("create_recipe", {
    p_name: payload.name,
    p_category: payload.category,
    p_version: toJson(payload.version),
    p_photo_path: photo.path ?? undefined,
  });
  if (error) {
    if (photo.path) await supabase.storage.from("recipe-photos").remove([photo.path]);
    return { status: "error", message: "No se pudo guardar la receta. Intenta de nuevo." };
  }

  redirect(`/recetas?creada=${recipeId}`);
}
