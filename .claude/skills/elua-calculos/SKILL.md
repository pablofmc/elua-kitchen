---
name: elua-calculos
description: Elúa Kitchen calculation rules — recipe scaling by pieces × weight, combined production, baker's percentages, true hydration with starter, rounding and display. Load before writing or changing anything in src/lib/calc, the calculator, batch snapshots, or any code that turns recipe quantities into numbers on screen.
---

# Elúa calculation rules

Source of truth: `docs/Elua-Kitchen-Fase-1.pdf` §04. If code and this file disagree, ask the user before changing either.

## Where the code lives

- All math is pure TypeScript in `src/lib/calc/` — no React, no Supabase, no I/O.
- Every rule below has a Vitest test in `src/lib/calc/*.test.ts`. A change to a rule changes its test first.
- UI and server code call these functions; they never re-implement a formula inline.

## Rules

**Scaling**
```
factor       = (pieces × dough weight per piece) ÷ base dough weight
new quantity = base quantity × factor
```
Base dough weight = sum of the recipe version's ingredient lines in grams (ml counts 1:1 with g unless the ingredient has a density; units use their grams-per-unit).

**Combined production**: scale each line (recipe × pieces × weight) separately, then sum by ingredient id. Ingredients in different *components* (masa, relleno, frosting) stay separate within a recipe; the consolidated total is for shopping/weighing only.

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
- Unit ingredients (eggs) → "2.4 huevos (≈ 120 g)".
- Display uses Spanish formatting (`es-MX`): `1,731 g`, `34.6 g`. Confirm locale with the user if numbers look wrong to them.
- Weights are raw dough before baking; label it.

## Golden test cases (must always pass)

Classic recipe: harina 350 g, agua 220 g, masa madre 70 g, sal 7 g → base 647 g.

| Case | Expected |
|---|---|
| 4 × 800 g | factor 3200/647 ≈ 4.946; harina 1,731 g · agua 1,088 g · masa madre 346 g · sal 34.6 g · total 3,200 g |
| 6 × 500 g | harina 1,623 g · agua 1,020 g · masa madre 325 g · sal 32.5 g · total 3,000 g |
| 4 × 800 + 6 × 500 | harina 3,354 g · agua 2,108 g · masa madre 671 g · sal 67.1 g · total 6,200 g |
| Hydration | flour in starter 35 g · total flour 385 g · true hydration 66.2 % · over added flour 62.9 % · salt 1.8 % |

Note the combined totals are summed **before** rounding (e.g. 1,731.07 + 1,622.88), so they can differ by 1 from summing the rounded columns.

## Batches

A batch line stores the recipe *version* id and a snapshot of the computed quantities at full precision. Never recompute a saved batch from the current recipe.
