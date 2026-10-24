begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.ingredients (id, name, kind) overriding system value values (901, 'Harina', 'harina'), (902, 'Agua', 'liquido');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "is_anonymous": false}';

select lives_ok($$
  select public.create_recipe('  Pan clásico ', 'salado', '{
    "base_yield": 1,
    "components": [{"name": "Masa", "lines": [
      {"ingredient_id": 901, "quantity": 350, "unit": "g", "counts_as_flour": true},
      {"ingredient_id": 902, "quantity": 220, "unit": "g"}
    ]}],
    "steps": [
      {"name": "Autólisis", "duration_minutes": 30},
      {"name": "Pliegues", "duration_minutes": 5, "repeats": 4, "interval_minutes": 30},
      {"name": "Formado", "is_manual": true}
    ]
  }'::jsonb)
$$, 'create_recipe saves a whole recipe');

select is((select name from public.recipes), 'Pan clásico', 'name is trimmed');
select is((select version_number from public.recipe_versions), 1, 'first version is 1');
select is((select count(*) from public.ingredient_lines), 2::bigint, 'both lines saved');
select is((select array_agg(position order by position) from public.ingredient_lines), array[0, 1]::smallint[], 'lines keep their order');
select is((select count(*) from public.process_steps), 3::bigint, 'steps saved');

select lives_ok($$
  select public.add_recipe_version((select id from public.recipes), '{"base_yield": 2, "change_note": "doble", "components": [{"name": "Masa", "lines": [{"ingredient_id": 901, "quantity": 700, "unit": "g"}]}]}'::jsonb)
$$, 'add_recipe_version adds a version');
select is((select max(version_number) from public.recipe_versions), 2, 'next version is numbered 2');

-- A bad line rolls the whole recipe back.
select throws_ok($$
  select public.create_recipe('Roto', 'dulce', '{"base_yield": 1, "components": [{"name": "Masa", "lines": [{"ingredient_id": 901, "quantity": 0, "unit": "g"}]}]}'::jsonb)
$$, '23514', null, 'invalid quantities are rejected');

reset role;
select * from finish();
rollback;
