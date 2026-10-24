begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Signed-out visitors can't touch anything.
set local role anon;
select throws_ok('select * from public.recipes', '42501', null, 'anon cannot read recipes');
select throws_ok('select * from public.ingredients', '42501', null, 'anon cannot read ingredients');
select throws_ok($$insert into public.recipes (name, category) values ('x', 'dulce')$$, '42501', null, 'anon cannot add recipes');
reset role;

-- A signed-in kitchen member can build a whole recipe version.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "is_anonymous": false}';

select lives_ok($$insert into public.ingredients (name, kind) values ('Harina', 'harina')$$, 'member adds an ingredient');
select lives_ok($$insert into public.ingredients (name, kind, default_unit, grams_per_unit) values ('Huevo', 'otro', 'unidad', 50)$$, 'member adds a unit ingredient');
select throws_ok($$insert into public.ingredients (name, default_unit) values ('Limón', 'unidad')$$, '23514', null, 'unit ingredients need grams per unit');
select throws_ok($$insert into public.ingredients (name) values ('  harina ')$$, '23505', null, 'ingredient names are unique ignoring case and spaces');

select lives_ok($$
  with r as (insert into public.recipes (name, category) values ('Rollos de canela', 'dulce') returning id),
       v as (insert into public.recipe_versions (recipe_id, version_number, base_yield) select id, 1, 10 from r returning id),
       c as (insert into public.recipe_components (version_id, position, name) select id, 0, 'Masa' from v returning id)
  insert into public.ingredient_lines (component_id, ingredient_id, position, quantity, unit, counts_as_flour)
  select c.id, i.id, 0, 500, 'g', true from c, public.ingredients i where i.name = 'Harina'
$$, 'member creates a recipe with a version, a component and a line');

select lives_ok($$
  insert into public.process_steps (version_id, position, name, duration_minutes, repeats, interval_minutes)
  select id, 0, 'Pliegues', 5, 4, 30 from public.recipe_versions
$$, 'member adds repeated step');
select lives_ok($$
  insert into public.process_steps (version_id, position, name, is_manual)
  select id, 1, 'Formado', true from public.recipe_versions
$$, 'member adds a manual step');
select throws_ok($$
  insert into public.process_steps (version_id, position, name, duration_minutes, repeats)
  select id, 2, 'Pliegues sin intervalo', 5, 4 from public.recipe_versions
$$, '23514', null, 'repeated steps need an interval');

select is((select count(*) from public.ingredient_lines), 1::bigint, 'member reads ingredient lines');

-- Versions are immutable.
select throws_ok('update public.recipe_versions set base_yield = 12', '42501', null, 'versions cannot be updated');
select throws_ok('delete from public.ingredient_lines', '42501', null, 'ingredient lines cannot be deleted');

-- Recipe metadata stays editable.
select lives_ok($$update public.recipes set name = 'Rollos de canela clásicos'$$, 'member renames a recipe');
reset role;

-- Anonymous sign-ins carry the authenticated role but see nothing.
set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated", "is_anonymous": true}';
select is((select count(*) from public.recipes), 0::bigint, 'anonymous users see no recipes');
reset role;

select * from finish();
rollback;
