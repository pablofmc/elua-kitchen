-- Saves an edited recipe in one transaction.
-- Name, category and photo update the recipe in place. A version payload, sent only when something
-- that affects calculations changed, adds a new version; old versions are never touched.
-- p_expected_version is the version the editor started from: if someone saved a newer one meanwhile,
-- nothing is written and the call fails with SQLSTATE EL409.
create function public.update_recipe(
  p_recipe_id bigint,
  p_expected_version integer,
  p_name text,
  p_category public.recipe_category,
  p_photo_path text default null,
  p_version jsonb default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current integer;
begin
  -- Lock the recipe row so two saves can't both pass the version check.
  perform 1 from public.recipes where id = p_recipe_id for update;
  if not found then
    raise exception 'recipe % not found', p_recipe_id using errcode = 'P0002';
  end if;

  select max(version_number) into v_current from public.recipe_versions where recipe_id = p_recipe_id;
  if v_current is distinct from p_expected_version then
    raise exception 'recipe % is at version %, not %', p_recipe_id, v_current, p_expected_version using errcode = 'EL409';
  end if;

  update public.recipes
  set name = btrim(p_name), category = p_category, photo_path = p_photo_path
  where id = p_recipe_id;

  if p_version is not null then
    perform public.add_recipe_version(p_recipe_id, p_version);
    v_current := v_current + 1;
  end if;

  return v_current;
end;
$$;

revoke execute on function public.update_recipe(bigint, integer, text, public.recipe_category, text, jsonb) from public, anon;
grant execute on function public.update_recipe(bigint, integer, text, public.recipe_category, text, jsonb) to authenticated;
