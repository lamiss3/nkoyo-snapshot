import { emailDb, asEmailJson, processEmailJob } from "./email-jobs.server";
import { prepareKitJob } from "./kit-jobs.server";
import type { EmailJourney } from "./email-journey";
import type { KitDraftState } from "./email-job-types";

async function refreshScheduledKitJob() {
  const due = await emailDb
    .from("email_journeys")
    .select("*")
    .eq("automation_enabled", true)
    .eq("status", "draft")
    .eq("kit_state->>status", "scheduled")
    .is("lock_token", null)
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at")
    .limit(1);
  if (due.error) throw new Error("Could not read scheduled email status.");
  const job = due.data?.[0];
  if (!job) return;
  const original = job.kit_state,
    state = structuredClone(original) as unknown as KitDraftState;
  delete state.error;
  try {
    for (const message of state.messages ?? []) {
      const response = await fetch(`https://api.kit.com/v4/broadcasts/${message.broadcastId}`, {
        headers: { "X-Kit-Api-Key": process.env["KIT_API_KEY"] ?? "" },
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Kit status is temporarily unavailable.");
      const payload = (await response.json()) as {
        broadcast: { public: boolean; status: string; send_at: string | null };
      };
      if (payload.broadcast.public !== false) {
        state.error = "Kit privacy settings changed. Review this broadcast in Kit.";
        break;
      }
      message.providerStatus = payload.broadcast.status;
    }
  } catch {
    state.error = "Kit status could not be refreshed. The worker will check again later.";
  }
  if (
    state.messages?.length &&
    state.messages.every((message) => message.providerStatus === "completed")
  )
    state.status = "completed";
  const saved = await emailDb
    .from("email_journeys")
    .update({
      kit_state: asEmailJson(state),
      next_attempt_at: new Date(Date.now() + 1800000).toISOString(),
    })
    .eq("id", job.id)
    .is("lock_token", null)
    .eq("kit_state", JSON.stringify(original))
    .select("id");
  if (saved.error) throw new Error("Could not save Kit status.");
  if (saved.data?.length)
    await emailDb.from("email_journey_events").insert({
      journey_id: job.id,
      event_type: "kit_delivery_status_checked",
      details: asEmailJson({
        messages: state.messages,
        error: state.error ?? null,
        inboxDeliveryConfirmed: false,
      }),
    });
}

export async function processAutomaticKitJob(id: string) {
  if (process.env["EMAIL_AUTOMATION_ENABLED"] !== "true") return { prepared: false };
  const found = await emailDb.from("email_journeys").select("*").eq("id", id).single();
  if (found.error) throw new Error("Could not load automatic email request.");
  const job = found.data;
  if (!job || !job.automation_enabled || job.status !== "draft" || !job.content || job.lock_token)
    return { prepared: false };
  if ((job.content as unknown as EmailJourney).source === "fixed_test") return { prepared: false };
  const state = job.kit_state as unknown as KitDraftState;
  if (
    state.status === "scheduled" ||
    state.status === "completed" ||
    state.status === "reconcile" ||
    state.status === "preparing" ||
    state.status === "drafts_ready"
  )
    return { prepared: false };
  return prepareKitJob(id, null, true);
}

/** Supabase Cron calls this authenticated worker; the visitor's browser is optional. */
export async function runAutomaticEmailWorker() {
  if (process.env["EMAIL_AUTOMATION_ENABLED"] !== "true") return { enabled: false };
  // An interrupted provider write is never retried blindly after its lease expires.
  const stale = await emailDb
    .from("email_journeys")
    .select("id,kit_state,lock_token")
    .eq("automation_enabled", true)
    .eq("status", "draft")
    .not("lock_token", "is", null)
    .lt("locked_until", new Date().toISOString())
    .limit(1);
  if (stale.error) throw new Error("Could not check interrupted email uploads.");
  for (const job of stale.data ?? []) {
    const state = job.kit_state as unknown as KitDraftState;
    const released = await emailDb
      .from("email_journeys")
      .update({
        lock_token: null,
        locked_until: null,
        kit_state: asEmailJson({
          ...state,
          status: "reconcile",
          error:
            "This Kit upload was interrupted. Check its saved broadcast IDs in Kit before retrying.",
        }),
      })
      .eq("id", job.id)
      .eq("lock_token", job.lock_token!)
      .select("id");
    if (released.error) throw new Error("Could not record interrupted email upload.");
    if (released.data?.length)
      await emailDb
        .from("email_journey_events")
        .insert({
          journey_id: job.id,
          event_type: "automation_attention_required",
          details: { stage: "kit", reason: "expired_upload_lease" },
        });
  }
  await refreshScheduledKitJob();
  // A bounded batch resumes index delays without claiming any old review/test journeys.
  const pending = await emailDb
    .from("email_journeys")
    .select("id,kit_state")
    .eq("automation_enabled", true)
    .eq("status", "draft")
    .or("kit_state->>status.is.null,kit_state->>status.eq.awaiting_recipient")
    .is("lock_token", null)
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at")
    .limit(1);
  if (pending.error) throw new Error("Could not read automatic email queue.");
  let scheduled = 0;
  for (const job of pending.data ?? []) {
    const state = job.kit_state as unknown as KitDraftState;
    if (state.status && state.status !== "awaiting_recipient") continue;
    try {
      if ((await processAutomaticKitJob(job.id)).prepared) scheduled++;
    } catch {
      await emailDb.from("email_journey_events").insert({
        journey_id: job.id,
        event_type: "automation_attention_required",
        details: asEmailJson({
          stage: "kit",
          message: "Check the saved provider records in Admin before retrying.",
        }),
      });
    }
  }
  // Keep one mutation stage per tick within the server's execution budget.
  if (pending.data?.length) return { enabled: true, scheduled, generated: { processed: false } };
  const queued = await emailDb
    .from("email_journeys")
    .select("id")
    .eq("automation_enabled", true)
    .in("status", ["queued", "generating"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("created_at")
    .limit(1);
  if (queued.error) throw new Error("Could not read generation queue.");
  const generated = queued.data?.[0]
    ? await processEmailJob(queued.data[0].id)
    : { processed: false };
  return { enabled: true, scheduled, generated };
}
