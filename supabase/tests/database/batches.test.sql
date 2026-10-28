begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into public.recipes (name, category) values ('Rollos', 'dulce');
insert into public.recipe_versions (recipe_id, version_number, base_yield)
  select id, 1, 10 from public.recipes where name = 'Rollos';

set local role anon;
select throws_ok('select * from public.batches', '42501', null, 'anon cannot read batches');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "is_anonymous": false}';

select lives_ok($$
  insert into public.batches (recipe_version_id, recipe_name, planned_pieces, snapshot)
  select id, 'Rollos', 30, '{"factor": 3, "components": []}' from public.recipe_versions
$$, 'member saves a planned batch');
select is((select production_date from public.batches), current_date, 'production date defaults to today');
select throws_ok($$
  insert into public.batches (recipe_version_id, recipe_name, planned_pieces, snapshot)
  select id, 'Rollos', 0, '{}' from public.recipe_versions
$$, '23514', null, 'planned pieces start at 1');

select throws_ok($$update public.batches set snapshot = '{"factor": 4}'$$, '23514', null, 'the snapshot never changes');
select throws_ok($$update public.batches set planned_pieces = 40$$, '23514', null, 'planned pieces never change');
select throws_ok($$update public.batches set status = 'horneado'$$, '23514', null, 'a baked batch needs its real pieces');
select lives_ok($$update public.batches set status = 'horneado', actual_pieces = 28, baked_at = now(), rating = 5, notes = 'Bien'$$, 'member marks it baked');
select throws_ok($$update public.batches set rating = 6$$, '23514', null, 'rating is 1 to 5');

select lives_ok($$
  insert into public.process_runs (recipe_version_id, batch_id)
  select recipe_version_id, id from public.batches
$$, 'a process can belong to a batch');
select is((select count(*) from public.process_runs where batch_id is not null), 1::bigint, 'the process knows its batch');

select lives_ok('delete from public.batches', 'deleting a baked batch runs...');
reset role;
select is((select count(*) from public.batches), 1::bigint, '...but keeps it: baked batches are history');

select * from finish();
rollback;
