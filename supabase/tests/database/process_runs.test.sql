begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.recipes (name, category) values ('Hogaza', 'salado');
insert into public.recipe_versions (recipe_id, version_number, base_yield)
  select id, 1, 1 from public.recipes where name = 'Hogaza';
-- Remembered here because RLS hides the version from the anonymous sign-in below.
select set_config('test.version_id', id::text, true) from public.recipe_versions;

set local role anon;
select throws_ok('select * from public.process_runs', '42501', null, 'anon cannot read processes');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000002", "role": "authenticated", "is_anonymous": true}';
select is((select count(*) from public.process_runs), 0::bigint, 'anonymous sign-ins see no processes');
select throws_ok($$insert into public.process_runs (recipe_version_id) values (current_setting('test.version_id')::bigint)$$, '42501', null, 'anonymous sign-ins cannot start one');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated", "is_anonymous": false}';
select lives_ok($$insert into public.process_runs (recipe_version_id, ends_at) select id, now() + interval '30 minutes' from public.recipe_versions$$, 'member starts a process');
select lives_ok($$insert into public.process_runs (recipe_version_id) select id from public.recipe_versions$$, 'a second process can run at the same time');
select lives_ok($$update public.process_runs set ends_at = null, remaining_seconds = 600 where ends_at is not null$$, 'member pauses a timer');
select throws_ok($$update public.process_runs set ends_at = now() where remaining_seconds is not null$$, '23514', null, 'a timer is either running or paused');
select throws_ok($$update public.process_runs set status = 'terminado' where remaining_seconds is not null$$, '23514', null, 'a finished process has no timer');
select throws_ok('delete from public.process_runs', '42501', null, 'processes are not deleted, only cancelled');

select * from finish();
rollback;
