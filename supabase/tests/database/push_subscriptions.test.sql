begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@elua.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@elua.test');

set local role anon;
select throws_ok('select * from public.push_subscriptions', '42501', null, 'anon cannot read devices');
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated", "is_anonymous": false}';
select lives_ok($$insert into public.push_subscriptions (endpoint, p256dh, auth) values ('https://push.example/a', 'k', 's')$$, 'member registers a device');
select is((select user_id from public.push_subscriptions), '00000000-0000-0000-0000-00000000000a'::uuid, 'the device belongs to whoever registered it');
select throws_ok(
  $$insert into public.push_subscriptions (endpoint, p256dh, auth, user_id) values ('https://push.example/x', 'k', 's', '00000000-0000-0000-0000-00000000000b')$$,
  '42501', null, 'nobody registers a device for someone else');

set local request.jwt.claims to '{"sub": "00000000-0000-0000-0000-00000000000b", "role": "authenticated", "is_anonymous": false}';
select is((select count(*) from public.push_subscriptions), 0::bigint, 'members only see their own devices');
select lives_ok($$delete from public.push_subscriptions where endpoint = 'https://push.example/a'$$, 'deleting another person''s device runs');
reset role;
select is((select count(*) from public.push_subscriptions), 1::bigint, '...but removes nothing');

set local role authenticated;
select throws_ok('select private.notify_due_processes()', '42501', null, 'members cannot call the cron function');

select * from finish();
rollback;
