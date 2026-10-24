"use server";

import { refresh, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseIngredientForm, type FieldErrors } from "@/lib/ingredients";
import { createActionClient } from "@/lib/supabase/auth";

/** `saves` counts successful saves so the form clears itself after each one. */
export type IngredientFormState = {
  status: "idle" | "saved" | "error";
  errors?: FieldErrors;
  message?: string;
  savedName?: string;
  saves?: number;
};

const DUPLICATE = "23505";

export async function createIngredient(prev: IngredientFormState, formData: FormData): Promise<IngredientFormState> {
  const saves = prev.saves ?? 0;
  const parsed = parseIngredientForm(formData);
  if ("errors" in parsed) return { status: "error", errors: parsed.errors, saves };

  const supabase = await createActionClient();
  const { error } = await supabase.from("ingredients").insert(parsed.data);
  if (error) {
    return error.code === DUPLICATE
      ? { status: "error", errors: { name: "Ya existe un ingrediente con ese nombre." }, saves }
      : { status: "error", message: "No se pudo guardar. Intenta de nuevo.", saves };
  }

  revalidatePath("/", "layout");
  refresh();
  return { status: "saved", savedName: parsed.data.name, saves: saves + 1 };
}

export async function updateIngredient(id: number, _prev: IngredientFormState, formData: FormData): Promise<IngredientFormState> {
  const parsed = parseIngredientForm(formData);
  if ("errors" in parsed) return { status: "error", errors: parsed.errors };

  const supabase = await createActionClient();
  const { error, count } = await supabase.from("ingredients").update(parsed.data, { count: "exact" }).eq("id", id);
  if (error) {
    return error.code === DUPLICATE
      ? { status: "error", errors: { name: "Ya existe un ingrediente con ese nombre." } }
      : { status: "error", message: "No se pudo guardar. Intenta de nuevo." };
  }
  if (count === 0) return { status: "error", message: "Ese ingrediente ya no existe." };

  // Ingredient names show on every recipe page and in Calcular.
  revalidatePath("/", "layout");
  redirect("/recetas/ingredientes");
}
