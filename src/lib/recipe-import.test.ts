import { describe, expect, it } from "vitest";
import { draftFromImport, ingredientKey, type ImportedRecipe } from "./recipe-import";
import { validateRecipeDraft } from "./recipes";

const catalog = [
  { id: 1, name: "Harina panadera", kind: "harina" as const, default_unit: "g" as const },
  { id: 2, name: "Azúcar", kind: "azucar" as const, default_unit: "g" as const },
  { id: 3, name: "Huevo", kind: "otro" as const, default_unit: "unidad" as const },
];

const line = (ingredient: string, quantity: number | null, unit: "g" | "ml" | "unidad" | null, kind: ImportedRecipe["components"][0]["lines"][0]["kind"] = "otro") => ({
  ingredient,
  kind,
  quantity,
  unit,
  original: `${quantity ?? "?"} ${unit ?? ""} ${ingredient}`,
});

const rollos: ImportedRecipe = {
  name: "Rollos de canela",
  category: "dulce",
  base_yield: 10,
  components: [
    { name: "Masa", lines: [line("harina panadera", 500, "g", "harina"), line("AZUCAR", 60, "g"), line("Huevo", 2, "unidad")] },
    { name: "Relleno", lines: [line("Mantequilla", 80, "g", "grasa"), line("Canela", null, null)] },
  ],
  steps: [
    { name: "Amasado", is_manual: true, duration_minutes: null, repeats: null, interval_minutes: null },
    { name: "Pliegues", is_manual: false, duration_minutes: 5, repeats: 4, interval_minutes: 30 },
    { name: "Primera fermentación", is_manual: false, duration_minutes: null, repeats: null, interval_minutes: null },
  ],
};

describe("ingredientKey", () => {
  it("ignores case, accents and extra spaces", () => {
    expect(ingredientKey("  Azúcar   Morena ")).toBe(ingredientKey("azucar morena"));
  });
});

describe("draftFromImport", () => {
  const { draft, review, newIngredients } = draftFromImport(rollos, catalog);

  it("matches catalog ingredients by name and marks flour", () => {
    expect(draft.components[0].lines.map((l) => l.ingredient_id)).toEqual([1, 2, 3]);
    expect(draft.components[0].lines[0].counts_as_flour).toBe(true);
    expect(draft.components[0].lines[2]).toMatchObject({ quantity: "2", unit: "unidad" });
  });

  it("proposes missing ingredients once and leaves their lines empty and flagged", () => {
    expect(newIngredients).toEqual([
      { name: "Mantequilla", kind: "grasa", default_unit: "g" },
      { name: "Canela", kind: "otro", default_unit: "g" },
    ]);
    expect(draft.components[1].lines[0].ingredient_id).toBeNull();
    expect(review["c1-l0.ingredient_id"]).toContain("Mantequilla");
  });

  it("leaves unreadable amounts and times empty instead of guessing", () => {
    expect(draft.components[1].lines[1].quantity).toBe("");
    expect(review["c1-l1.quantity"]).toContain("Canela");
    expect(draft.steps[2].duration_minutes).toBe("");
    expect(review["s2.duration_minutes"]).toBeDefined();
    expect(draft.steps[1]).toMatchObject({ duration_minutes: "5", repeats: "4", interval_minutes: "30" });
  });

  it("flags a missing name, category and yield", () => {
    const blank = draftFromImport({ ...rollos, name: null, category: null, base_yield: null }, catalog);
    expect(blank.draft).toMatchObject({ name: "", category: "", base_yield: "" });
    expect(Object.keys(blank.review)).toEqual(expect.arrayContaining(["name", "category", "base_yield"]));
  });

  it("validates once the new ingredients exist and the gaps are filled", () => {
    const fuller = [...catalog, { id: 4, name: "Mantequilla", kind: "grasa" as const, default_unit: "g" as const }, { id: 5, name: "canela", kind: "otro" as const, default_unit: "g" as const }];
    const again = draftFromImport(rollos, fuller).draft;
    again.components[1].lines[1].quantity = "8";
    again.steps[2].duration_minutes = "180";
    const checked = validateRecipeDraft(again, fuller.map((item) => ({ id: item.id, grams_per_unit: item.id === 3 ? 50 : null })));
    expect(checked).toHaveProperty("payload");
  });

  it("drops empty parts and still gives the form one line to start from", () => {
    const empty = draftFromImport({ ...rollos, components: [{ name: "Masa", lines: [] }] }, catalog);
    expect(empty.draft.components).toHaveLength(1);
    expect(empty.review.components).toBeDefined();
  });
});
