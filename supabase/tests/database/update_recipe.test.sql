begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into public.ingredients (id, name, kind) overriding system value values (901, 'Harina', 'harina');

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "is_anonymous": false}';

select public.create_recipe('Rollos', 'dulce',
  '{"base_yield": 10, "components": [{"name": "Masa", "lines": [{"ingredient_id": 901, "quantity": 500, "unit": "g"}]}]}'::jsonb) as id \gset

select is(public.update_recipe(:id, 1, 'Rollos de canela', 'dulce'), 1, 'renaming keeps the version');
select is((select name from public.recipes where id = :id), 'Rollos de canela', 'name updated');
select is((select count(*) from public.recipe_versions where recipe_id = :id), 1::bigint, 'no new version for a rename');

select is(public.update_recipe(:id, 1, 'Rollos de canela', 'dulce', null,
  '{"base_yield": 12, "change_note": "más chicos", "components": [{"name": "Masa", "lines": [{"ingredient_id": 901, "quantity": 500, "unit": "g"}]}]}'::jsonb),
  2, 'a calculation change adds version 2');
select is((select base_yield from public.recipe_versions where recipe_id = :id and version_number = 1), 10, 'version 1 is untouched');
select is((select change_note from public.recipe_versions where recipe_id = :id and version_number = 2), 'más chicos', 'change note saved');

select throws_ok(format($$select public.update_recipe(%s, 1, 'Viejo', 'dulce')$$, :id), 'EL409', null, 'saving from a stale version fails');
select is((select name from public.recipes where id = :id), 'Rollos de canela', 'a stale save writes nothing');

reset role;
select * from finish();
rollback;
