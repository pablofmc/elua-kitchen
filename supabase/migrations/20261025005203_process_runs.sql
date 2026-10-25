-- A process (proceso): a recipe version in progress, step by step. See GLOSSARY.md and src/lib/process.ts,
-- which expands the version's steps into slots; slot_index points into that list.

create type public.process_status as enum ('activo', 'terminado', 'cancelado');

create table public.process_runs (
  id bigint generated always as identity primary key,
  recipe_version_id bigint not null references public.recipe_versions (id),
  status public.process_status not null default 'activo',
  slot_index integer not null default 0 check (slot_index >= 0),
  slot_started_at timestamptz not null default now(),
  -- When the current timer ends; null for manual slots and while paused.
  ends_at timestamptz,
  -- Seconds left on a paused timer.
  remaining_seconds integer check (remaining_seconds > 0),
  -- When the "timer done" notice went out for the current ends_at.
  notified_at timestamptz,
  -- One entry per finished slot: {slot, startedAt, endedAt, skipped?}.
  log jsonb not null default '[]'::jsonb check (jsonb_typeof(log) = 'array'),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or remaining_seconds is null),
  check (status = 'activo' or (ends_at is null and remaining_seconds is null))
);

comment on table public.process_runs is 'A recipe version in progress. Several can run at once.';

create index process_runs_recipe_version_id_idx on public.process_runs (recipe_version_id);
create index process_runs_active_idx on public.process_runs (ends_at) where status = 'activo';

create trigger process_runs_set_updated_at before update on public.process_runs
  for each row execute function public.set_updated_at();

revoke all on public.process_runs from anon, authenticated;
grant select, insert, update on public.process_runs to authenticated;

alter table public.process_runs enable row level security;

create policy "kitchen members read processes" on public.process_runs
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members start processes" on public.process_runs
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members move processes" on public.process_runs
  for update to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true')
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
