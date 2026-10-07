import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../integrations/supabase/client.server";
import type { Database, Json } from "../integrations/supabase/types";
import type { EmailDatabase, EmailJob, EmailJobView } from "./email-job-types";
import type { AssessmentSession } from "./types";
import { validateAssessmentSession } from "./session-validation";
import {
  verifyEmailCapability,
  safeJobError,
  assertFixedEmailTestAllowed,
} from "./email-job-policy.server";
import { fixedTestEmailJourney } from "./email-journey-fixed";
import { createGeminiEmailJourneyWriter } from "./email-journey.server";
import { AssessmentTrace } from "./trace-runtime.server";
import { supabaseTraceStore } from "./logging.server";
import type { TraceDatabase } from "./trace-types";

export const emailDb = supabaseAdmin as unknown as SupabaseClient<EmailDatabase>;
function checked(error: unknown) {
  if (error)
    throw new Error(
      "Email storage is unavailable. Check the email migration and server configuration.",
    );
}
export const asEmailJson = (value: unknown): Json => JSON.parse(JSON.stringify(value)) as Json;
export function emailJobView(row: EmailJob): EmailJobView {
  const { lock_token: _secret, ...view } = row;
  return view as unknown as EmailJobView;
}
export async function requireEmailStaff(client: SupabaseClient<Database>, userId: string) {
  const roles = await client.from("user_roles").select("role").eq("user_id", userId);
  if (roles.error || !roles.data?.some((row) => row.role === "staff" || row.role === "admin"))
    throw new Error("Staff access is required.");
}
async function completedSession(sessionId: string, token?: string): Promise<AssessmentSession> {
  const saved = await emailDb
    .from("adaptive_assessment_traces")
    .select("snapshot,token_hash,status,stage")
    .eq("session_id", sessionId)
    .single();
  if (saved.error || !saved.data) throw new Error("A saved completed assessment is required.");
  if (token !== undefined) verifyEmailCapability(token, saved.data.token_hash);
  if (saved.data.status !== "completed" || saved.data.stage !== "complete")
    throw new Error("Finish the assessment before requesting a report.");
  const session = validateAssessmentSession(saved.data.snapshot as unknown as AssessmentSession);
  if (session.id !== sessionId || session.stage !== "complete" || !session.result)
    throw new Error("Invalid completed assessment.");
  return session;
}
export async function captureEmailRequest(input: {
  sessionId: string;
  traceToken: string;
  email: string;
  consent: boolean;
}) {
  await completedSession(input.sessionId, input.traceToken);
  const queued = await emailDb.rpc("enqueue_email_journey", {
    p_session: input.sessionId,
    p_email: input.email,
    p_consent: input.consent,
    p_automate: process.env["EMAIL_AUTOMATION_ENABLED"] === "true",
  });
  checked(queued.error);
  const persisted = await emailDb
    .from("email_journeys")
    .select("automation_enabled")
    .eq("id", queued.data!)
    .single();
  checked(persisted.error);
  return {
    jobId: queued.data!,
    saved: true,
    automatic: persisted.data?.automation_enabled === true,
  };
}
export async function processOwnedEmail(input: { sessionId: string; traceToken: string }) {
  await completedSession(input.sessionId, input.traceToken);
  const job = await emailDb
    .from("email_journeys")
    .select("id")
    .eq("session_id", input.sessionId)
    .single();
  checked(job.error);
  if (!job.data) throw new Error("Report request not found.");
  const result = await processEmailJob(job.data.id);
  // Persistent worker also resumes this stage if this request is interrupted.
  if (process.env["EMAIL_AUTOMATION_ENABLED"] === "true")
    await (await import("./email-automation.server")).processAutomaticKitJob(job.data.id);
  return result;
}
export async function createFixedTestEmailJob(sessionId: string, email: string, actorId: string) {
  assertFixedEmailTestAllowed(process.env["KIT_MODE"], email, process.env["KIT_TEST_EMAILS"]);
  await completedSession(sessionId);
  const queued = await emailDb.rpc("enqueue_email_journey", {
    p_session: sessionId,
    p_email: email,
    p_consent: true,
  });
  checked(queued.error);
  const found = await emailDb.from("email_journeys").select("*").eq("id", queued.data!).single();
  checked(found.error);
  if (!found.data || !found.data.followup_consent)
    throw new Error(
      "Use a test assessment whose request includes all five emails. Existing consent is not changed.",
    );
  if (found.data.content) {
    if ((found.data.content as unknown as { source?: string }).source !== "fixed_test")
      throw new Error("Existing email content cannot be replaced with test templates.");
    return { jobId: found.data.id, processed: false, status: "draft" };
  }
  return {
    jobId: found.data.id,
    ...(await processEmailJobWithWriter(found.data.id, true, actorId)),
  };
}
export async function processEmailJob(id?: string, retry = false) {
  return processEmailJobWithWriter(id, retry);
}
async function processEmailJobWithWriter(id?: string, retry = false, fixedTestActor?: string) {
  const claimed = await emailDb.rpc("claim_email_journey", {
    ...(id ? { p_id: id } : {}),
    p_retry: retry,
  });
  checked(claimed.error);
  const job = claimed.data?.[0];
  if (!job) return { processed: false };
  try {
    const session = await completedSession(job.session_id);
    let content;
    if (fixedTestActor) {
      assertFixedEmailTestAllowed(
        process.env["KIT_MODE"],
        job.email,
        process.env["KIT_TEST_EMAILS"],
      );
      content = fixedTestEmailJourney(session);
      const event = await emailDb.from("email_journey_events").insert({
        journey_id: job.id,
        event_type: "fixed_test_drafts_prepared",
        actor_id: fixedTestActor,
        details: asEmailJson({ source: "fixed_test", noModelCall: true, content }),
      });
      checked(event.error);
    } else {
      const trace = new AssessmentTrace(
        supabaseTraceStore(emailDb as unknown as SupabaseClient<TraceDatabase>),
        session,
        ["GEMINI_API_KEY", "JEV_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "KIT_API_KEY"].map(
          (key) => process.env[key] ?? "",
        ),
      );
      const writer = createGeminiEmailJourneyWriter({
        apiKey: process.env["GEMINI_API_KEY"] ?? "",
        model:
          process.env["EMAIL_GEMINI_MODEL"] || process.env["GEMINI_MODEL"] || "gemini-3.6-flash",
        trace: trace.recorder(job.lock_token!),
      });
      content = await writer.generate(session);
    }
    const saved = await emailDb.rpc("finish_email_journey", {
      p_id: job.id,
      p_lock: job.lock_token!,
      p_content: asEmailJson(content),
    });
    checked(saved.error);
    return { processed: saved.data === true, status: "draft" };
  } catch (error) {
    const saved = await emailDb.rpc("finish_email_journey", {
      p_id: job.id,
      p_lock: job.lock_token!,
      p_content: null,
      p_error: safeJobError(error),
    });
    checked(saved.error);
    return { processed: saved.data === true, status: "retry_pending" };
  }
}
export async function listEmailJobs() {
  const rows = await emailDb
    .from("email_journeys")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  checked(rows.error);
  return (rows.data ?? []).map(emailJobView);
}
export async function approveEmailJob(id: string, actorId: string) {
  const saved = await emailDb
    .from("email_journeys")
    .update({
      approved_at: new Date().toISOString(),
      approved_by: actorId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "draft")
    .not("content", "is", null)
    .select("id")
    .single();
  checked(saved.error);
  const event = await emailDb
    .from("email_journey_events")
    .insert({ journey_id: id, event_type: "drafts_approved", actor_id: actorId });
  checked(event.error);
  return { approved: true };
}
