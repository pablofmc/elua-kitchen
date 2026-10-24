import { describe, expect, it } from "vitest";
import { draftFromVersion, validateRecipeDraft, versionChanged, type RecipeDraft } from "./recipes";

const catalog = [
  { id: 1, grams_per_unit: null },
  { id: 2, grams_per_unit: 50 },
];

function draft(overrides: Partial<RecipeDraft> = {}): RecipeDraft {
  return {
    name: "Rollos de canela",
    category: "dulce",
    base_yield: "10",
    change_note: "",
    components: [
      {
        key: "c1",
        name: "Masa",
        lines: [
          { key: "l1", ingredient_id: 1, quantity: "500", unit: "g", counts_as_flour: true },
          { key: "l2", ingredient_id: 2, quantity: "1", unit: "unidad", counts_as_flour: false },
        ],
      },
    ],
    steps: [
      { key: "s1", name: "Pliegues", is_manual: false, duration_minutes: "5", repeats: "4", interval_minutes: "30" },
      { key: "s2", name: "Formado", is_manual: true, duration_minutes: "", repeats: "", interval_minutes: "" },
    ],
    ...overrides,
  };
}

describe("validateRecipeDraft", () => {
  it("builds the payload for a valid recipe", () => {
    expect(validateRecipeDraft(draft(), catalog)).toEqual({
      payload: {
        name: "Rollos de canela",
        category: "dulce",
        version: {
          base_yield: 10,
          change_note: null,
          components: [
            {
              name: "Masa",
              lines: [
                { ingredient_id: 1, quantity: 500, unit: "g", counts_as_flour: true },
                { ingredient_id: 2, quantity: 1, unit: "unidad", counts_as_flour: false },
              ],
            },
          ],
          steps: [
            { name: "Pliegues", is_manual: false, duration_minutes: 5, repeats: 4, interval_minutes: 30 },
            { name: "Formado", is_manual: true, duration_minutes: null, repeats: 1, interval_minutes: null },
          ],
        },
      },
    });
  });

  it("accepts a decimal comma in quantities", () => {
    const result = validateRecipeDraft(
      draft({ components: [{ key: "c", name: "Masa", lines: [{ key: "l", ingredient_id: 1, quantity: "7,5", unit: "g", counts_as_flour: false }] }] }),
      catalog,
    );
    expect("payload" in result && result.payload.version.components[0].lines[0].quantity).toBe(7.5);
  });

  it("asks for the basics", () => {
    expect(validateRecipeDraft(draft({ name: " ", category: "", base_yield: "0", components: [] }), catalog)).toEqual({
      errors: {
        name: "Escribe el nombre de la receta.",
        category: "Elige Dulce o Salado.",
        base_yield: "Escribe cuántas piezas salen (1 o más).",
        components: "Agrega al menos un ingrediente.",
      },
    });
  });

  it("points at the exact line and step that are wrong", () => {
    const result = validateRecipeDraft(
      draft({
        components: [
          {
            key: "c",
            name: "",
            lines: [
              { key: "l1", ingredient_id: null, quantity: "0", unit: "g", counts_as_flour: false },
              { key: "l2", ingredient_id: 1, quantity: "2", unit: "unidad", counts_as_flour: false },
            ],
          },
          { key: "c2", name: "Relleno", lines: [] },
        ],
        steps: [{ key: "s", name: "Pliegues", is_manual: false, duration_minutes: "5", repeats: "4", interval_minutes: "" }],
      }),
      catalog,
    );
    expect(result).toEqual({
      errors: {
        "components.0.name": "Ponle nombre a esta parte (p. ej. Masa).",
        "components.0.lines.0.ingredient_id": "Elige un ingrediente.",
        "components.0.lines.0.quantity": "Escribe una cantidad mayor que 0.",
        "components.0.lines.1.unit": "Este ingrediente no tiene gramos por unidad. Usa g o ml, o edítalo en Ingredientes.",
        "components.1.lines": "Agrega al menos un ingrediente o quita esta parte.",
        "steps.0.interval_minutes": "¿Cada cuántos minutos se repite?",
      },
    });
  });

  it("rejects fractional pieces and minutes", () => {
    const result = validateRecipeDraft(
      draft({ base_yield: "2.5", steps: [{ key: "s", name: "Reposo", is_manual: false, duration_minutes: "1.5", repeats: "", interval_minutes: "" }] }),
      catalog,
    );
    expect(result).toEqual({
      errors: { base_yield: "Escribe cuántas piezas salen (1 o más).", "steps.0.duration_minutes": "Minutos enteros, 1 o más." },
    });
  });
});

describe("draftFromVersion and versionChanged", () => {
  const saved = {
    baseYield: 10,
    components: [{ name: "Masa", lines: [{ ingredientId: 1, quantity: 500, unit: "g" as const, countsAsFlour: true }] }],
    steps: [
      { name: "Pliegues", isManual: false, durationMinutes: 5, repeats: 4, intervalMinutes: 30 },
      { name: "Formado", isManual: true, durationMinutes: null, repeats: 1, intervalMinutes: null },
    ],
  };
  const payloadOf = (d: RecipeDraft) => {
    const result = validateRecipeDraft(d, catalog);
    if (!("payload" in result)) throw new Error(JSON.stringify(result.errors));
    return result.payload.version;
  };

  it("round-trips a saved version without changes", () => {
    const original = payloadOf(draftFromVersion("Rollos", "dulce", saved));
    const reloaded = payloadOf({ ...draftFromVersion("Rollos de canela", "salado", saved), change_note: "solo el nombre" });
    expect(versionChanged(original, reloaded)).toBe(false);
  });

  it("notices a new quantity or yield", () => {
    const original = payloadOf(draftFromVersion("Rollos", "dulce", saved));
    const edited = draftFromVersion("Rollos", "dulce", saved);
    expect(versionChanged(original, payloadOf({ ...edited, base_yield: "12" }))).toBe(true);
    edited.components[0].lines[0].quantity = "520";
    expect(versionChanged(original, payloadOf(edited))).toBe(true);
  });
});
