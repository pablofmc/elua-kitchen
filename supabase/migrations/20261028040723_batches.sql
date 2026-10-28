-- A batch (lote): one recipe scaled to a number of pieces for a production day, plus what happened
-- when it was baked. See GLOSSARY.md. Its quantities are a fixed copy: history never changes.

create type public.batch_status as enum ('planeado', 'horneado');

create table public.batches (
  id bigint generated always as identity primary key,
  recipe_version_id bigint not null references public.recipe_versions (id),
  -- The recipe's name when the batch was saved; renaming the recipe later doesn't rewrite history.
  recipe_name text not null,
  production_date date not null default current_date,
  status public.batch_status not null default 'planeado',
  planned_pieces integer not null check (planned_pieces between 1 and 9999),
  actual_pieces integer check (actual_pieces between 0 and 9999),
  -- The scaled quantities at full precision, as src/lib/batches.ts BatchSnapshot describes.
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  rating smallint check (rating between 1 and 5),
  notes text check (char_length(notes) <= 2000),
  photo_path text,
  baked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'planeado' or (actual_pieces is not null and baked_at is not null))
);

comment on table public.batches is 'Saved productions. The snapshot, version and planned pieces never change after saving.';

create index batches_production_date_idx on public.batches (production_date desc, id desc);
create index batches_recipe_version_id_idx on public.batches (recipe_version_id);

create trigger batches_set_updated_at before update on public.batches
  for each row execute function public.set_updated_at();

-- What was calculated stays as it was calculated.
create function public.keep_batch_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.snapshot is distinct from old.snapshot
    or new.recipe_version_id is distinct from old.recipe_version_id
    or new.planned_pieces is distinct from old.planned_pieces
    or new.recipe_name is distinct from old.recipe_name then
    raise exception 'A batch''s calculated quantities never change'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger batches_keep_snapshot before update on public.batches
  for each row execute function public.keep_batch_snapshot();

revoke all on public.batches from anon, authenticated;
grant select, insert, update, delete on public.batches to authenticated;

alter table public.batches enable row level security;

create policy "kitchen members read batches" on public.batches
  for select to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members save batches" on public.batches
  for insert to authenticated
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
create policy "kitchen members record batches" on public.batches
  for update to authenticated
  using (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true')
  with check (((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
-- Only a planned batch can go away; a baked one is history.
create policy "kitchen members remove planned batches" on public.batches
  for delete to authenticated
  using (status = 'planeado' and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true');
