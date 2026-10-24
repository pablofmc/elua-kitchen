"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cardClass, inputClass } from "@/components/ui";
import { CATEGORY_LABELS, type RecipeCategory } from "@/lib/recipes";

export type RecipeSummary = {
  id: number;
  name: string;
  category: RecipeCategory;
  baseYield: number;
  version: number;
  photoUrl: string | null;
};

type Filter = "todas" | RecipeCategory;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "dulce", label: CATEGORY_LABELS.dulce },
  { value: "salado", label: CATEGORY_LABELS.salado },
];

/** Ignores case and accents, so "pan" finds "Pan clásico" and "clasico" finds it too. */
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function RecipeList({ recipes }: { recipes: RecipeSummary[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");

  const needle = normalize(query.trim());
  const shown = recipes.filter(
    (recipe) => (filter === "todas" || recipe.category === filter) && (!needle || normalize(recipe.name).includes(needle)),
  );

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="recipe-search" className="sr-only">Buscar receta</label>
        <input
          id="recipe-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar receta"
          autoComplete="off"
          className={`${inputClass} mt-0`}
        />
      </div>

      <div role="group" aria-label="Categoría" className="grid grid-cols-3 gap-1 rounded-xl bg-crema p-1">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`min-h-11 rounded-lg text-sm outline-cafe-oscuro focus-visible:outline-2 ${
              filter === option.value ? "bg-white font-bold text-tinta shadow-sm" : "font-semibold text-tinta-suave"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-tinta-suave">
          {needle ? `Ninguna receta coincide con «${query.trim()}».` : "No hay recetas en esta categoría."}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((recipe) => (
            <li key={recipe.id}>
              <Link
                href={`/recetas/${recipe.id}`}
                className={`${cardClass} flex min-h-16 items-center gap-3 p-3 outline-cafe-oscuro hover:bg-crema-claro focus-visible:outline-2`}
              >
                {recipe.photoUrl ? (
                  <Image src={recipe.photoUrl} alt="" width={48} height={48} unoptimized className="size-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-crema text-lg font-bold text-cafe-oscuro">
                    {recipe.name.charAt(0)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{recipe.name}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-tinta-suave">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-tinta ${recipe.category === "dulce" ? "bg-crema" : "bg-celeste/40"}`}>
                      {CATEGORY_LABELS[recipe.category]}
                    </span>
                    <span>Rinde {recipe.baseYield} {recipe.baseYield === 1 ? "pieza" : "piezas"}</span>
                    <span>· v{recipe.version}</span>
                  </span>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0 fill-none stroke-tinta-suave" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
