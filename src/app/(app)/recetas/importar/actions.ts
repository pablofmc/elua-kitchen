"use server";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";
import { KIND_LABELS, type IngredientKind, type Unit } from "@/lib/ingredients";
import { loadCatalog } from "@/lib/recipe-data";
import { ImportedRecipeSchema, type ImportedRecipe, type ProposedIngredient } from "@/lib/recipe-import";
import { createActionClient } from "@/lib/supabase/auth";
import type { CatalogIngredient } from "../recipe-form";

/** `reads` counts successful reads, so the page can tell a new result from one it already moved past. */
export type ReadState = { reads: number; imported?: ImportedRecipe; error?: string };

const MAX_TEXT = 20_000;
const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const SYSTEM = `You read bakery recipes for Elúa, a small sourdough bakery in Mexico, and turn them into structured data. Recipes are usually in Spanish, sometimes handwritten or photographed.

Rules:
- Copy what the recipe says. Never invent or estimate a value that isn't written. If something is missing or unreadable, use null.
- name: the recipe's title, in the recipe's language.
- category: "dulce" for sweet bakes (cinnamon rolls, conchas, cakes, cookies), "salado" for savory (bread loaves, baguettes, focaccia). null only if you truly can't tell.
- base_yield: how many pieces the recipe makes, as written ("rinde 10 rollos" → 10; "1 hogaza" → 1). null if it doesn't say.
- components: the parts of the recipe (e.g. "Masa", "Relleno", "Frosting"). If there is only one list of ingredients, use one component named "Masa".
- Each line: ingredient is the ingredient name. When an ingredient is clearly the same as one in the catalog list provided, write the catalog name exactly; otherwise write the recipe's name in Spanish, capitalized ("Mantequilla"). Never merge different ingredients (bread flour and whole wheat flour are different).
- kind: harina (any flour), liquido (water, milk, juice), masa_madre (sourdough starter, levain), sal, grasa (butter, oil), azucar (sugar, honey, syrup), otro (everything else, including eggs, yeast, spices).
- quantity and unit: only "g", "ml" or "unidad". Convert kg → g and l → ml. Countable items without a weight (eggs, yolks) use "unidad". For cups, spoons, "una pizca" or anything else that isn't weight, volume in ml/l, or a count, set quantity and unit to null; do not convert.
- original: the line exactly as written, e.g. "2 tazas de harina".
- steps: the process steps in order, with short names ("Autólisis", "Pliegues", "Primera fermentación", "Horneado"). duration_minutes is the length of one occurrence in whole minutes (convert hours). For repeated steps like folds ("4 pliegues cada 30 minutos"), repeats is the count and interval_minutes the time between them. is_manual is true for hands-on steps without a written time (mixing, shaping). Leave timing null when not written.
- Ignore anything that isn't part of the recipe (stories, notes about the photo).`;

/** Reads a pasted or photographed recipe with Claude. Nothing is saved: the result only fills the form. */
export async function readRecipe(prev: ReadState, formData: FormData): Promise<ReadState> {
  const fail = (error: string): ReadState => ({ reads: prev.reads, error });
  const text = String(formData.get("text") ?? "").trim();
  const image = formData.get("image");
  const hasImage = image instanceof File && image.size > 0;

  if (!text && !hasImage) return fail("Pega el texto de la receta o elige una foto.");
  if (text.length > MAX_TEXT) return fail("El texto es muy largo. Pega solo una receta.");
  if (hasImage && !IMAGE_TYPES.includes(image.type as ImageType)) return fail("La foto debe ser JPG, PNG o WebP.");
  if (hasImage && image.size > MAX_IMAGE_BYTES) return fail("La foto es muy pesada. Intenta con otra.");
  if (!process.env.ANTHROPIC_API_KEY) return fail("Falta configurar la clave de la IA (ANTHROPIC_API_KEY).");

  const supabase = await createActionClient();
  const catalog = await loadCatalog(supabase);

  const content: Anthropic.ContentBlockParam[] = [];
  if (hasImage) {
    const data = Buffer.from(await image.arrayBuffer()).toString("base64");
    content.push({ type: "image", source: { type: "base64", media_type: image.type as ImageType, data } });
  }
  content.push({
    type: "text",
    text: [
      `Catalog ingredients: ${catalog.length ? catalog.map((item) => item.name).join(", ") : "(empty)"}`,
      text ? `Recipe:\n<recipe>\n${text}\n</recipe>` : "The recipe is in the photo.",
    ].join("\n\n"),
  });

  try {
    const response = await new Anthropic().messages.parse({
      model: "claude-haiku-5-5",
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
      output_config: { format: zodOutputFormat(ImportedRecipeSchema) },
    });
    if (response.stop_reason === "refusal") return fail("La IA no quiso leer esto. Captura la receta a mano.");
    if (response.stop_reason === "max_tokens" || !response.parsed_output) {
      return fail("No se pudo leer la receta completa. Intenta con menos texto o captúrala a mano.");
    }
    return { reads: prev.reads + 1, imported: response.parsed_output };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) return fail("La IA está ocupada. Espera un minuto e intenta de nuevo.");
    if (error instanceof Anthropic.AuthenticationError) return fail("La clave de la IA no es válida. Revisa ANTHROPIC_API_KEY.");
    if (error instanceof Anthropic.BadRequestError) return fail("La IA no pudo abrir esto. Prueba con otra foto o pega el texto.");
    if (error instanceof Anthropic.APIError) return fail("La IA no respondió. Intenta de nuevo en un momento.");
    throw error;
  }
}

export type NewIngredientInput = ProposedIngredient & { grams_per_unit: number | null };
export type AddState = { catalog: CatalogIngredient[] } | { errors: Record<number, string> } | { message: string };

const DUPLICATE = "23505";

/** Adds the confirmed new ingredients to the catalog and returns the catalog to match against. */
export async function addIngredients(items: NewIngredientInput[]): Promise<AddState> {
  const errors: Record<number, string> = {};
  const rows = items.map((item, i) => {
    const name = String(item.name ?? "").trim().replace(/\s+/g, " ");
    const kind = item.kind as IngredientKind;
    const unit = item.default_unit as Unit;
    const grams = unit === "unidad" ? Number(item.grams_per_unit) : null;
    if (!name || name.length > 80) errors[i] = "Escribe el nombre (máximo 80 caracteres).";
    else if (!(kind in KIND_LABELS) || !["g", "ml", "unidad"].includes(unit)) errors[i] = "Elige tipo y unidad.";
    else if (grams !== null && !(grams > 0)) errors[i] = "Escribe cuántos gramos pesa cada una.";
    return { name, kind, default_unit: unit, grams_per_unit: grams };
  });
  if (Object.keys(errors).length > 0) return { errors };

  const supabase = await createActionClient();
  for (const row of rows) {
    const { error } = await supabase.from("ingredients").insert(row);
    // Someone added it meanwhile: the catalog below already has it.
    if (error && error.code !== DUPLICATE) return { message: "No se pudieron agregar los ingredientes. Intenta de nuevo." };
  }

  revalidatePath("/", "layout");
  return { catalog: await loadCatalog(supabase) };
}
