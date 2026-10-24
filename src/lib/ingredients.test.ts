import { describe, expect, it } from "vitest";
import { parseIngredientForm } from "./ingredients";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("parseIngredientForm", () => {
  it("accepts a gram ingredient and tidies the name", () => {
    expect(parseIngredientForm(form({ name: "  Harina   de trigo ", kind: "harina", default_unit: "g" }))).toEqual({
      data: { name: "Harina de trigo", kind: "harina", default_unit: "g", grams_per_unit: null },
    });
  });

  it("ignores grams per unit unless the unit is unidad", () => {
    const result = parseIngredientForm(form({ name: "Leche", kind: "liquido", default_unit: "ml", grams_per_unit: "50" }));
    expect(result).toEqual({ data: { name: "Leche", kind: "liquido", default_unit: "ml", grams_per_unit: null } });
  });

  it("requires grams per unit for unit ingredients and accepts a decimal comma", () => {
    expect(parseIngredientForm(form({ name: "Huevo", kind: "otro", default_unit: "unidad" }))).toEqual({
      errors: { grams_per_unit: "Escribe cuántos gramos pesa cada una." },
    });
    expect(parseIngredientForm(form({ name: "Huevo", kind: "otro", default_unit: "unidad", grams_per_unit: "52,5" }))).toEqual({
      data: { name: "Huevo", kind: "otro", default_unit: "unidad", grams_per_unit: 52.5 },
    });
  });

  it("reports every missing field", () => {
    expect(parseIngredientForm(form({ name: " ", kind: "", default_unit: "kg" }))).toEqual({
      errors: { name: "Escribe el nombre.", kind: "Elige un tipo.", default_unit: "Elige una unidad." },
    });
  });
});
