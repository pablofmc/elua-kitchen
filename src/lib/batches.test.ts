import { describe, expect, it } from "vitest";
import { formatQuantity } from "./calc/format";
import { formatProductionDate, makeSnapshot, parseProductionDate } from "./batches";
import type { CalcRecipe } from "./calc";

const rolls: CalcRecipe = {
  baseYield: 10,
  components: [
    {
      name: "Masa",
      lines: [
        { ingredientId: 1, name: "Harina", kind: "harina", quantity: 500, unit: "g", gramsPerUnit: null, countsAsFlour: true },
        { ingredientId: 2, name: "Huevo", kind: "otro", quantity: 1, unit: "unidad", gramsPerUnit: 50, countsAsFlour: false },
      ],
    },
  ],
};

describe("makeSnapshot", () => {
  it("keeps full precision and where the factor came from", () => {
    const snapshot = makeSnapshot(rolls, 25);
    expect(snapshot.factor).toBe(2.5);
    expect(snapshot.versionBaseYield).toBe(10);
    expect(snapshot.recipe.baseYield).toBe(25);
    expect(snapshot.recipe.components[0].lines[1].quantity).toBe(2.5); // shown as 3 huevos, stored as 2.5
    expect(formatQuantity(snapshot.recipe.components[0].lines[1])).toBe("3 huevos (≈ 150 g)");
  });

  it("survives a trip through JSON unchanged", () => {
    const snapshot = makeSnapshot(rolls, 30);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});

describe("production dates", () => {
  it("accepts real calendar days only", () => {
    expect(parseProductionDate("2026-10-28")).toBe("2026-10-28");
    expect(parseProductionDate("2026-02-30")).toBeNull();
    expect(parseProductionDate("28/10/2026")).toBeNull();
    expect(parseProductionDate("")).toBeNull();
  });

  it("reads in Spanish without shifting the day", () => {
    expect(formatProductionDate("2026-10-28")).toBe("Miércoles, 28 de octubre de 2026");
  });
});
