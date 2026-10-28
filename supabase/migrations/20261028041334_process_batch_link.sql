-- A process can belong to a batch (plan §05: "puede ligarse a un lote"), so the batch shows how its
-- process went and the process knows which production it's for.
alter table public.process_runs
  add column batch_id bigint references public.batches (id) on delete set null;

create index process_runs_batch_id_idx on public.process_runs (batch_id);
