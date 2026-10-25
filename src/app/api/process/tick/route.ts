import { timingSafeEqual } from "node:crypto";
import webpush from "web-push";
import { doneMessage, slotTitle } from "@/lib/process";
import { loadRun } from "@/lib/process-data";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Called by the Supabase cron job (private.notify_due_processes) when a timer is due. Claims every
 * due, unannounced step and sends one push notice per step to every kitchen device.
 */
export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) return new Response("Unauthorized", { status: 401 });

  const supabase = createAdminClient();
  // Claiming first means a second tick at the same moment finds nothing to send twice.
  const { data: claimed, error } = await supabase
    .from("process_runs")
    .update({ notified_at: new Date().toISOString() })
    .eq("status", "activo")
    .is("notified_at", null)
    .lte("ends_at", new Date().toISOString())
    .select("id");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (claimed.length === 0) return Response.json({ sent: 0 });

  const [{ data: devices, error: devicesError }, runs] = await Promise.all([
    supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth"),
    Promise.all(claimed.map(({ id }) => loadRun(supabase, id))),
  ]);
  if (devicesError) return Response.json({ error: devicesError.message }, { status: 500 });

  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  const gone = new Set<number>();
  let sent = 0;
  for (const run of runs) {
    const slot = run?.slots[run.state.slotIndex];
    if (!run || !slot) continue;
    const payload = JSON.stringify({
      title: doneMessage(slot),
      body: `${run.recipeName} · ${slot.kind === "wait" ? "toca Listo cuando hagas el pliegue" : `sigue: ${nextTitle(run.slots, run.state.slotIndex)}`}`,
      url: `/proceso/${run.id}`,
      tag: `proceso-${run.id}`,
    });
    await Promise.all(
      devices.map(async (device) => {
        try {
          await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, payload, {
            TTL: 15 * 60,
            urgency: "high",
          });
          sent++;
        } catch (failure) {
          // 404/410: the browser dropped this subscription; forget the device.
          const status = (failure as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) gone.add(device.id);
          else console.error("push failed", status, (failure as Error).message);
        }
      }),
    );
  }
  if (gone.size > 0) await supabase.from("push_subscriptions").delete().in("id", [...gone]);
  return Response.json({ sent, steps: runs.length, removed: gone.size });
}

function nextTitle(slots: Parameters<typeof slotTitle>[0][], index: number) {
  const next = slots[index + 1];
  return next ? slotTitle(next) : "terminar";
}

function authorized(header: string | null) {
  const secret = process.env.PROCESS_TICK_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
