-- Notices when a process step's timer runs out, even with the phone locked (Web Push).
-- Every ~15 s a cron job checks for due timers that haven't been announced and, only then,
-- calls the app's /api/process/tick, which sends the push notices.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- One row per phone or browser that turned notices on. Notices go to every device in the kitchen (ADR 0001).
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.push_subscriptions is 'Devices that receive process notices. Read by the tick route with the secret key.';

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

alter table public.push_subscriptions enable row level security;

-- A device's keys are only visible to the person who registered it; sending happens server-side.
create policy "members see their devices" on public.push_subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "members add their devices" on public.push_subscriptions
  for insert to authenticated
  with check ((select auth.uid()) = user_id and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "members update their devices" on public.push_subscriptions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "members remove their devices" on public.push_subscriptions
  for delete to authenticated
  using ((select auth.uid()) = user_id);

create index process_runs_due_idx on public.process_runs (ends_at)
  where status = 'activo' and notified_at is null;

-- Marking a notice as sent isn't a move: it must not change updated_at, which screens use to
-- detect a move from another phone.
drop trigger process_runs_set_updated_at on public.process_runs;
create trigger process_runs_set_updated_at before update on public.process_runs
  for each row
  when ((old.status, old.slot_index, old.slot_started_at, old.ends_at, old.remaining_seconds, old.log)
    is distinct from (new.status, new.slot_index, new.slot_started_at, new.ends_at, new.remaining_seconds, new.log))
  execute function public.set_updated_at();

-- Not exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

/**
 * Calls the app when a timer is due and hasn't been announced yet. The URL and the shared secret
 * live in Vault (process_tick_url, process_tick_secret); until both are set this does nothing.
 */
create function private.notify_due_processes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tick_url text;
  tick_secret text;
begin
  if not exists (
    select 1 from public.process_runs
    where status = 'activo' and notified_at is null and ends_at <= now()
  ) then
    return;
  end if;

  select decrypted_secret into tick_url from vault.decrypted_secrets where name = 'process_tick_url';
  select decrypted_secret into tick_secret from vault.decrypted_secrets where name = 'process_tick_secret';
  if tick_url is null or tick_secret is null then
    return;
  end if;

  perform net.http_post(
    url := tick_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tick_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

revoke all on function private.notify_due_processes() from public, anon, authenticated;

select cron.schedule('notify-due-processes', '15 seconds', 'select private.notify_due_processes()');

-- Run history isn't cleaned up on its own; at four runs a minute it adds up.
select cron.schedule(
  'clean-cron-history',
  '17 3 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '2 days'$$
);
