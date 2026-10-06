import { emailDb, asEmailJson } from "./email-jobs.server";
import { prepareKitDrafts } from "./kit-client.server";
import type { EmailJourney } from "./email-journey";
import type { KitDraftState } from "./email-job-types";
import { assertFixedEmailTestAllowed } from "./email-job-policy.server";

export async function prepareKitJob(id: string, actorId: string) {
  const apiKey = process.env["KIT_API_KEY"],
    sender = process.env["KIT_SENDER_EMAIL"];
  const templateId = Number(process.env["KIT_CLASSIC_TEMPLATE_ID"]);
  if (!apiKey || !sender || !Number.isSafeInteger(templateId) || templateId < 1)
    throw new Error("Connect a Kit API key, verified sender and Classic template ID first.");
  const found = await emailDb.from("email_journeys").select("*").eq("id", id).single();
  if (found.error || !found.data) throw new Error("Email journey not found.");
  const job = found.data;
  if (job.status !== "draft" || !job.content || !job.approved_at)
    throw new Error("Review and approve the drafts first.");
  if ((job.content as unknown as EmailJourney).source === "fixed_test")
    assertFixedEmailTestAllowed(process.env["KIT_MODE"], job.email, process.env["KIT_TEST_EMAILS"]);
  // The personal Creator test account may receive only explicitly allowed test addresses.
  if (process.env["KIT_MODE"] !== "production") {
    const allowed = (process.env["KIT_TEST_EMAILS"] ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
    if (!allowed.includes(job.email.toLowerCase()))
      throw new Error("This contact is not an allowed Kit test recipient.");
  }
  const oldState = job.kit_state as unknown as KitDraftState;
  if (oldState.status === "drafts_ready") return { prepared: true };
  if (oldState.status && oldState.status !== "awaiting_recipient")
    throw new Error("The Kit attempt needs reconciliation in Kit before retrying.");
  // Compare-and-swap the initial state: only one staff request can own provider mutations.
  const token = crypto.randomUUID();
  const claimed = await emailDb
    .from("email_journeys")
    .update({
      lock_token: token,
      locked_until: new Date(Date.now() + 180000).toISOString(),
      kit_state: { status: "preparing" },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("lock_token", null)
    .eq("kit_state", JSON.stringify(job.kit_state))
    .select("id");
  if (claimed.error || claimed.data?.length !== 1)
    throw new Error("This journey is already being prepared. Refresh its status.");
  const save = async (state: KitDraftState) => {
    const result = await emailDb
      .from("email_journeys")
      .update({ kit_state: asEmailJson(state), updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("lock_token", token)
      .select("id");
    if (result.error || result.data?.length !== 1)
      throw new Error("Could not save the Kit progress.");
  };
  try {
    const result = await prepareKitDrafts({
      apiKey,
      sender,
      templateId,
      email: job.email,
      consent: job.followup_consent,
      journey: job.content as unknown as EmailJourney,
      state: oldState,
      save,
      audit: async (event, details) => {
        const result = await emailDb.from("email_journey_events").insert({
          journey_id: id,
          event_type: event,
          actor_id: actorId,
          details: asEmailJson(details),
        });
        if (result.error) throw new Error("Could not save the Kit audit record.");
      },
    });
    return { prepared: result.status === "drafts_ready" };
  } finally {
    await emailDb
      .from("email_journeys")
      .update({ lock_token: null, locked_until: null })
      .eq("id", id)
      .eq("lock_token", token);
  }
}
