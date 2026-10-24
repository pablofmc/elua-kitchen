-- Saving a recipe version touches four tables; these functions do it in one transaction.
-- Both run as the caller (security invoker), so the RLS policies from the schema migration apply.

-- Adds the next version of a recipe from a JSON draft:
-- { base_yield, change_note?, components: [{ name, lines: [{ ingredient_id, quantity, unit, counts_as_flour }] }],
--   steps: [{ name, is_manual, duration_minutes?, repeats?, interval_minutes? }] }
create function public.add_recipe_version(p_recipe_id bigint, p_version jsonb)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version_id bigint;
  v_component_id bigint;
  v_component record;
begin
  insert into public.recipe_versions (recipe_id, version_number, base_yield, change_note)
  values (
    p_recipe_id,
    coalesce((select max(version_number) from public.recipe_versions where recipe_id = p_recipe_id), 0) + 1,
    (p_version ->> 'base_yield')::integer,
    nullif(btrim(p_version ->> 'change_note'), '')
  )
  returning id into v_version_id;

  for v_component in
    select value, ordinality - 1 as position
    from jsonb_array_elements(p_version -> 'components') with ordinality
  loop
    insert into public.recipe_components (version_id, position, name)
    values (v_version_id, v_component.position, btrim(v_component.value ->> 'name'))
    returning id into v_component_id;

    insert into public.ingredient_lines (component_id, ingredient_id, position, quantity, unit, counts_as_flour)
    select
      v_component_id,
      (line.value ->> 'ingredient_id')::bigint,
      line.ordinality - 1,
      (line.value ->> 'quantity')::numeric,
      (line.value ->> 'unit')::public.unit,
      coalesce((line.value ->> 'counts_as_flour')::boolean, false)
    from jsonb_array_elements(v_component.value -> 'lines') with ordinality as line;
  end loop;

  insert into public.process_steps (version_id, position, name, is_manual, duration_minutes, repeats, interval_minutes)
  select
    v_version_id,
    step.ordinality - 1,
    btrim(step.value ->> 'name'),
    coalesce((step.value ->> 'is_manual')::boolean, false),
    (step.value ->> 'duration_minutes')::integer,
    coalesce((step.value ->> 'repeats')::smallint, 1),
    (step.value ->> 'interval_minutes')::integer
  from jsonb_array_elements(coalesce(p_version -> 'steps', '[]'::jsonb)) with ordinality as step;

  return v_version_id;
end;
$$;

-- Creates a recipe and its version 1. Returns the recipe id.
create function public.create_recipe(p_name text, p_category public.recipe_category, p_version jsonb, p_photo_path text default null)
returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_recipe_id bigint;
begin
  insert into public.recipes (name, category, photo_path)
  values (btrim(p_name), p_category, p_photo_path)
  returning id into v_recipe_id;

  perform public.add_recipe_version(v_recipe_id, p_version);
  return v_recipe_id;
end;
$$;

revoke execute on function public.add_recipe_version(bigint, jsonb) from public, anon;
revoke execute on function public.create_recipe(text, public.recipe_category, jsonb, text) from public, anon;
grant execute on function public.add_recipe_version(bigint, jsonb) to authenticated;
grant execute on function public.create_recipe(text, public.recipe_category, jsonb, text) to authenticated;

-- Recipe photos: a private bucket, readable and writable only by kitchen members.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-photos', 'recipe-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

create policy "kitchen members read recipe photos" on storage.objects
  for select to authenticated
  using (bucket_id = 'recipe-photos' and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members upload recipe photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'recipe-photos' and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members replace recipe photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'recipe-photos' and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true')
  with check (bucket_id = 'recipe-photos' and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members delete recipe photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'recipe-photos' and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
