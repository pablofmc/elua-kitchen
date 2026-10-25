import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { expandSteps, type LogEntry, type RunState, type Slot } from "@/lib/process";

type Client = SupabaseClient<Database>;
type RunRow = Database["public"]["Tables"]["process_runs"]["Row"];

/** A process as the screens need it: its state plus the slots its recipe version expands into. */
export type ProcessRun = {
  id: number;
  recipeId: number;
  recipeName: string;
  versionNumber: number;
  startedAt: string;
  /** Concurrency token: a move only applies if nobody moved the process since it was loaded. */
  updatedAt: string;
  state: RunState;
  slots: Slot[];
};

const RUN_COLUMNS =
  "id, status, slot_index, slot_started_at, ends_at, remaining_seconds, log, started_at, updated_at, " +
  "recipe_versions(version_number, recipes(id, name), process_steps(position, name, is_manual, duration_minutes, repeats, interval_minutes))";

type RunWithVersion = Pick<RunRow, "id" | "status" | "slot_index" | "slot_started_at" | "ends_at" | "remaining_seconds" | "log" | "started_at" | "updated_at"> & {
  recipe_versions: {
    version_number: number;
    recipes: { id: number; name: string };
    process_steps: { position: number; name: string; is_manual: boolean; duration_minutes: number | null; repeats: number; interval_minutes: number | null }[];
  };
};

function toRun(row: RunWithVersion): ProcessRun {
  const steps = [...row.recipe_versions.process_steps].sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    recipeId: row.recipe_versions.recipes.id,
    recipeName: row.recipe_versions.recipes.name,
    versionNumber: row.recipe_versions.version_number,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    state: {
      status: row.status,
      slotIndex: row.slot_index,
      slotStartedAt: row.slot_started_at,
      endsAt: row.ends_at,
      remainingSeconds: row.remaining_seconds,
      log: row.log as unknown as LogEntry[],
    },
    slots: expandSteps(
      steps.map((step) => ({
        name: step.name,
        isManual: step.is_manual,
        durationMinutes: step.duration_minutes,
        repeats: step.repeats,
        intervalMinutes: step.interval_minutes,
      })),
    ),
  };
}

export async function loadRun(supabase: Client, id: number): Promise<ProcessRun | null> {
  const { data, error } = await supabase.from("process_runs").select(RUN_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toRun(data as unknown as RunWithVersion) : null;
}

/** Active processes, plus the ones that ended in the last day when `withRecent` is set. Newest first. */
export async function loadRuns(supabase: Client, { withRecent = false } = {}): Promise<ProcessRun[]> {
  let query = supabase.from("process_runs").select(RUN_COLUMNS).order("started_at", { ascending: false });
  query = withRecent
    ? query.or(`status.eq.activo,updated_at.gte.${new Date(Date.now() - 24 * 3600 * 1000).toISOString()}`)
    : query.eq("status", "activo");
  const { data, error } = await query.limit(50);
  if (error) throw error;
  return (data as unknown as RunWithVersion[]).map(toRun);
}

/** The server's clock, read once per request after the data so countdowns start from the same moment. */
export function serverTime() {
  return Date.now();
}

/** The columns a state change writes. A new or moved timer clears the "already notified" mark. */
export function stateColumns(state: RunState) {
  return {
    status: state.status,
    slot_index: state.slotIndex,
    slot_started_at: state.slotStartedAt,
    ends_at: state.endsAt,
    remaining_seconds: state.remainingSeconds,
    log: state.log as unknown as NonNullable<Json>,
    notified_at: null,
  };
}
