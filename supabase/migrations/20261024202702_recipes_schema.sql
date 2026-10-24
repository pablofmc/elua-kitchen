-- Recipe book (H1): ingredients, recipes and their immutable versions.
-- Vocabulary follows GLOSSARY.md. Access model: docs/adr/0001-shared-kitchen-workspace.md.

create type public.recipe_category as enum ('dulce', 'salado');
create type public.ingredient_kind as enum ('harina', 'liquido', 'masa_madre', 'sal', 'grasa', 'azucar', 'otro');
create type public.unit as enum ('g', 'ml', 'unidad');

-- Shared ingredient catalog. Unit ingredients (eggs) carry their grams per unit.
create table public.ingredients (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind public.ingredient_kind not null default 'otro',
  default_unit public.unit not null default 'g',
  grams_per_unit numeric(10, 2) check (grams_per_unit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ingredients_unit_needs_grams check (default_unit <> 'unidad' or grams_per_unit is not null)
);
create unique index ingredients_name_key on public.ingredients (lower(btrim(name)));

-- A recipe holds only what never affects a calculation. Everything else lives in a version.
create table public.recipes (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category public.recipe_category not null,
  photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A version is a fixed way of making the recipe. Rows here and below are never updated.
create table public.recipe_versions (
  id bigint generated always as identity primary key,
  recipe_id bigint not null references public.recipes (id) on delete restrict,
  version_number integer not null check (version_number >= 1),
  base_yield integer not null check (base_yield >= 1),
  change_note text check (char_length(change_note) <= 500),
  created_at timestamptz not null default now(),
  unique (recipe_id, version_number)
);

create table public.recipe_components (
  id bigint generated always as identity primary key,
  version_id bigint not null references public.recipe_versions (id) on delete cascade,
  position smallint not null check (position >= 0),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  unique (version_id, position)
);

create table public.ingredient_lines (
  id bigint generated always as identity primary key,
  component_id bigint not null references public.recipe_components (id) on delete cascade,
  ingredient_id bigint not null references public.ingredients (id) on delete restrict,
  position smallint not null check (position >= 0),
  quantity numeric(12, 3) not null check (quantity > 0),
  unit public.unit not null,
  counts_as_flour boolean not null default false,
  unique (component_id, position)
);
create index ingredient_lines_ingredient_id_idx on public.ingredient_lines (ingredient_id);

-- A step is either timed (duration, optionally repeated at an interval) or manual.
create table public.process_steps (
  id bigint generated always as identity primary key,
  version_id bigint not null references public.recipe_versions (id) on delete cascade,
  position smallint not null check (position >= 0),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  is_manual boolean not null default false,
  duration_minutes integer check (duration_minutes > 0),
  repeats smallint not null default 1 check (repeats >= 1),
  interval_minutes integer check (interval_minutes > 0),
  unique (version_id, position),
  constraint process_steps_timing check (
    (is_manual and duration_minutes is null and repeats = 1 and interval_minutes is null)
    or (not is_manual and duration_minutes is not null and (repeats = 1) = (interval_minutes is null))
  )
);

-- updated_at bookkeeping for the two mutable tables.
create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger ingredients_set_updated_at before update on public.ingredients
  for each row execute function public.set_updated_at();
create trigger recipes_set_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

-- Access: signed-in, non-anonymous users only. Nothing for anon.
-- Versions and their parts can be read and inserted, never updated or deleted.
revoke all on public.ingredients, public.recipes, public.recipe_versions,
  public.recipe_components, public.ingredient_lines, public.process_steps
  from anon, authenticated;

grant select, insert, update, delete on public.ingredients, public.recipes to authenticated;
grant select, insert on public.recipe_versions, public.recipe_components,
  public.ingredient_lines, public.process_steps to authenticated;

alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_versions enable row level security;
alter table public.recipe_components enable row level security;
alter table public.ingredient_lines enable row level security;
alter table public.process_steps enable row level security;

create policy "kitchen members read ingredients" on public.ingredients
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members add ingredients" on public.ingredients
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members edit ingredients" on public.ingredients
  for update to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true')
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members delete ingredients" on public.ingredients
  for delete to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');

create policy "kitchen members read recipes" on public.recipes
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members add recipes" on public.recipes
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members edit recipes" on public.recipes
  for update to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true')
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members delete recipes" on public.recipes
  for delete to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');

create policy "kitchen members read versions" on public.recipe_versions
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members add versions" on public.recipe_versions
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');

create policy "kitchen members read components" on public.recipe_components
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members add components" on public.recipe_components
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');

create policy "kitchen members read ingredient lines" on public.ingredient_lines
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members add ingredient lines" on public.ingredient_lines
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');

create policy "kitchen members read process steps" on public.process_steps
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members add process steps" on public.process_steps
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
