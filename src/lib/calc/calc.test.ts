import { describe, expect, it } from "vitest";
import { bakersPercent, hydration, lineGrams, parsePieces, scaleRecipe, totalGrams, type CalcLine, type CalcRecipe } from "./index";
import { formatFactor, formatGrams, formatPercent, formatQuantity } from "./format";

// Golden cases from .claude/skills/elua-calculos/SKILL.md. Test fixtures, not Elúa's real recipes.

let nextId = 1;
function line(name: string, kind: CalcLine["kind"], quantity: number, extra: Partial<CalcLine> = {}): CalcLine {
  return { ingredientId: nextId++, name, kind, quantity, unit: "g", gramsPerUnit: null, countsAsFlour: kind === "harina", ...extra };
}

const classic: CalcRecipe = {
  baseYield: 1,
  components: [
    {
      name: "Masa",
      lines: [line("Harina", "harina", 350), line("Agua", "liquido", 220), line("Masa madre", "masa_madre", 70), line("Sal", "sal", 7)],
    },
  ],
};

const rolls: CalcRecipe = {
  baseYield: 10,
  components: [
    {
      name: "Masa",
      lines: [
        line("Harina", "harina", 500),
        line("Leche", "liquido", 260),
        line("Huevo", "otro", 1, { unit: "unidad", gramsPerUnit: 50 }),
        line("Azúcar", "azucar", 60),
      ],
    },
    { name: "Relleno", lines: [line("Mantequilla", "grasa", 80), line("Azúcar", "azucar", 70), line("Canela", "otro", 9)] },
  ],
};

const shown = (recipe: CalcRecipe) => recipe.components.map((component) => component.lines.map(formatQuantity));

describe("scaling", () => {
  it("classic × 5", () => {
    const scaled = scaleRecipe(classic, 5);
    expect(scaled.factor).toBe(5);
    expect(shown(scaled)).toEqual([["1,750 g", "1,100 g", "350 g", "35.0 g"]]);
    expect(formatGrams(totalGrams(scaled))).toBe("3,235 g");
  });

  it("rolls × 30 keeps components apart", () => {
    const scaled = scaleRecipe(rolls, 30);
    expect(scaled.factor).toBe(3);
    expect(shown(scaled)).toEqual([
      ["1,500 g", "780 g", "3 huevos (≈ 150 g)", "180 g"],
      ["240 g", "210 g", "27.0 g"],
    ]);
  });

  it("rolls × 25 rounds 2.5 eggs up to 3", () => {
    const scaled = scaleRecipe(rolls, 25);
    expect(scaled.factor).toBe(2.5);
    expect(formatQuantity(scaled.components[0].lines[0])).toBe("1,250 g");
    expect(formatQuantity(scaled.components[0].lines[2])).toBe("3 huevos (≈ 150 g)");
    expect(formatQuantity(scaled.components[1].lines[2])).toBe("22.5 g");
    // Full precision stays in the data; only the display rounds.
    expect(lineGrams(scaled.components[0].lines[2])).toBe(125);
  });

  it("never shows less than one whole unit", () => {
    expect(formatQuantity({ name: "Huevo", quantity: 0.3, unit: "unidad", gramsPerUnit: 50 })).toBe("1 huevo (≈ 50 g)");
  });
});

describe("hydration (classic)", () => {
  const result = hydration(classic)!;

  it("counts the flour and water inside the starter", () => {
    expect(result.flourInStarter).toBe(35);
    expect(result.totalFlour).toBe(385);
    expect(formatPercent(result.trueHydration)).toBe("66.2 %");
    expect(formatPercent(result.hydrationOverAddedFlour)).toBe("62.9 %");
  });

  it("salt over total flour", () => {
    expect(formatPercent(bakersPercent(classic.components[0].lines[3], result.totalFlour))).toBe("1.8 %");
  });

  it("is null without flour", () => {
    expect(hydration({ baseYield: 1, components: [{ name: "Relleno", lines: [line("Azúcar", "azucar", 70)] }] })).toBeNull();
  });
});

describe("pieces and factor", () => {
  it("takes whole pieces from 1 to 9,999", () => {
    expect(parsePieces("30")).toBe(30);
    expect(parsePieces(" 2.6 ")).toBe(3);
    expect(parsePieces("1,200")).toBe(1200);
    expect(parsePieces("0")).toBe(1);
    expect(parsePieces("-4")).toBe(1);
    expect(parsePieces("50000")).toBe(9999);
    expect(parsePieces("")).toBeNull();
    expect(parsePieces("muchos")).toBeNull();
    expect(parsePieces(null)).toBeNull();
  });

  it("labels the factor in es-MX", () => {
    expect(formatFactor(scaleRecipe(rolls, 30).factor)).toBe("×3");
    expect(formatFactor(scaleRecipe(rolls, 25).factor)).toBe("×2.5");
    expect(formatFactor(scaleRecipe(classic, 1).factor)).toBe("×1");
    expect(formatFactor(1 / 3)).toBe("×0.33");
  });
});
