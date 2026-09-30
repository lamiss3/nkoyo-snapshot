import { supabase } from "@/integrations/supabase/client";
import type { Answers, DeepDiveAnswers } from "./snapshot-engine";
import { buildAdaptivePresentation } from "@/assessment-v2/result-content";
import type { AssessmentSession } from "@/assessment-v2/types";
import type { Json } from "@/integrations/supabase/types";

export async function recordCompletedSnapshot(input: {
  sessionKey: string;
  answers: Answers;
  deepDiveAnswers: DeepDiveAnswers;
  patternKeys: string[];
  summaryKey: string;
}) {
  const { error } = await supabase.from("assessment_sessions").insert({
    session_key: input.sessionKey,
    completed_at: new Date().toISOString(),
    answers: input.answers,
    followup_answers: input.deepDiveAnswers,
    result_patterns: input.patternKeys,
    summary_key: input.summaryKey,
  });
  if (error) throw error;
}

export async function logEvent(
  eventType: string,
  sessionKey: string | null,
  metadata: Record<string, string | number | boolean | null> = {},
) {
  // Best-effort analytics: never block the user journey.
  try {
    await supabase
      .from("snapshot_events")
      .insert({ event_type: eventType, session_key: sessionKey, metadata });
  } catch {
    /* ignore */
  }
}

export interface LeadInput {
  sessionKey: string | null;
  firstName: string;
  email: string;
  organization: string;
  roleTitle: string;
  challenge: string;
  marketingConsent: boolean;
}

export async function submitLead(input: LeadInput) {
  const { error } = await supabase.from("leads").insert({
    session_key: input.sessionKey,
    first_name: input.firstName,
    email: input.email,
    organization: input.organization || null,
    role_title: input.roleTitle || null,
    challenge: input.challenge || null,
    marketing_consent: input.marketingConsent,
    marketing_consent_at: input.marketingConsent ? new Date().toISOString() : null,
  });
  if (error) throw error;
}

/** Save a requested adaptive report and its email address under one session key.
 * Email delivery is not configured; this function does not send a message. */
export async function submitAdaptiveReportRequest(input: {
  session: AssessmentSession;
  email: string;
  marketingConsent: boolean;
}) {
  const { session } = input;
  if (session.stage !== "complete" || !session.result) throw new Error("Finish the assessment before requesting a report.");

  const presentation = buildAdaptivePresentation(session);
  const asJson = (value: object): Json => JSON.parse(JSON.stringify(value)) as Json;
  const { error: snapshotError } = await supabase.from("assessment_sessions").insert({
    session_key: session.id,
    completed_at: session.result.generatedAt,
    answers: asJson({ version: session.version, questions: session.questions, responses: session.answers }),
    followup_answers: asJson({ report: presentation, result: session.result }),
    result_patterns: session.result.priority,
    summary_key: session.result.priority[0] ?? null,
  });
  // A retry may follow a lead insert failure. The completed report is already saved then.
  if (snapshotError && snapshotError.code !== "23505") throw snapshotError;

  const { error: leadError } = await supabase.from("leads").insert({
    session_key: session.id,
    first_name: "",
    email: input.email,
    marketing_consent: input.marketingConsent,
    marketing_consent_at: input.marketingConsent ? new Date().toISOString() : null,
  });
  if (leadError) throw leadError;
}
