---
name: elua-calculos
description: Elúa Kitchen calculation rules — recipe scaling by number of pieces (one recipe at a time), baker's percentages, true hydration with starter, rounding and display. Load before writing or changing anything in src/lib/calc, the calculator, batch snapshots, or any code that turns recipe quantities into numbers on screen.
---

# Elúa calculation rules

Source of truth: `docs/plan-fase-1.html` §04 (it replaces the PDFs). Terms follow `GLOSSARY.md`. If code and this file disagree, ask the user before changing either.

## Where the code lives

- All math is pure TypeScript in `src/lib/calc/` — no React, no Supabase, no I/O.
- Every rule below has a Vitest test in `src/lib/calc/*.test.ts`. A change to a rule changes its test first.
- UI and server code call these functions; they never re-implement a formula inline.

## Rules

**Scaling** (by pieces only; changing piece size is a future feature, don't build it)
```
factor       = pieces wanted ÷ base yield
new quantity = base quantity × factor
```
Base yield belongs to the recipe *version*, like the ingredient lines. Every line in every component scales by the same factor. Total dough weight = sum of the scaled lines in grams (ml counts 1:1 with g unless the ingredient has a density; units use their grams-per-unit).

**One recipe at a time.** There is no combined production and no consolidated list across recipes: Elúa never works that way. Show results grouped by *component* (masa, relleno, frosting), plus the total weight.

**Baker's % and true hydration** (starter fixed at 100 % hydration in Phase 1):
```
flour in starter = starter ÷ (1 + starter hydration)
water in starter = starter − flour in starter
total flour      = added flour + flour in starter
true hydration   = (added water + water in starter) ÷ total flour
```
Show both views: % over added flour and % over total flour. Lines flagged `counts_as_flour` are flour; liquid-type ingredients are water.

**Precision and display**
- Keep full precision internally and in snapshots. Round only when formatting.
- ≥ 100 g → whole grams. < 100 g → one decimal.
- Unit ingredients (eggs) are always shown as whole units: round to the nearest whole (.5 rounds up, never below 1) → "3 huevos (≈ 150 g)", with the grams of the rounded count. Snapshots still keep full precision.
- Display uses `es-MX` formatting, confirmed by the user: `1,750 g`, `34.6 g`.
- Weights are raw dough before baking; label it.

## Golden test cases (must always pass)

These are test fixtures, not Elúa's real recipes.

Classic recipe: harina 350 g, agua 220 g, masa madre 70 g, sal 7 g → base 647 g, base yield 1 hogaza.

Rolls recipe, base yield 10 rollos. Masa: harina 500 g, leche 260 g, huevo 1 unit (50 g), azúcar 60 g. Relleno: mantequilla 80 g, azúcar 70 g, canela 9 g.

| Case | Expected |
|---|---|
| Classic × 5 | factor 5; harina 1,750 g · agua 1,100 g · masa madre 350 g · sal 35.0 g · total 3,235 g |
| Rolls × 30 | factor 3; masa: harina 1,500 g · leche 780 g · huevo 3 huevos (≈ 150 g) · azúcar 180 g; relleno: mantequilla 240 g · azúcar 210 g · canela 27.0 g |
| Rolls × 25 | factor 2.5; harina 1,250 g · huevo 3 huevos (≈ 150 g; 2.5 rounds up) · canela 22.5 g |
| Hydration (classic) | flour in starter 35 g · total flour 385 g · true hydration 66.2 % · over added flour 62.9 % · salt 1.8 % |

Totals are summed at full precision **before** rounding, so they can differ by 1 from summing the rounded lines.

## Batches

A batch (lote) is one recipe: it stores the recipe *version* id, the pieces and a snapshot of the computed quantities at full precision. Never recompute a saved batch from the current recipe.
