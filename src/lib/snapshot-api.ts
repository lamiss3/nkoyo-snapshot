import { supabase } from "@/integrations/supabase/client";
import type { Answers, DeepDiveAnswers } from "./snapshot-engine";
import type { AssessmentSession } from "@/assessment-v2/types";
import { requestPersonalizedEmails, prepareOwnedEmailDrafts } from "@/assessment-v2/email-actions";

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

/** Save contact + durable job atomically, then request a first preparation attempt. */
export async function submitAdaptiveReportRequest(input: {
  session: AssessmentSession;
  email: string;
  marketingConsent: boolean;
}) {
  const sessionId = input.session.id,
    traceToken = input.session.traceToken;
  if (!traceToken) throw new Error("A saved assessment is required for an email report.");
  const saved = await requestPersonalizedEmails({
    data: { sessionId, traceToken, email: input.email, consent: input.marketingConsent },
  });
  // The persisted queue survives a closed browser or interrupted request. Recovery runs
  // via the protected worker when scheduled; staff can retry in Admin. No unawaited server work.
  void prepareOwnedEmailDrafts({ data: { sessionId, traceToken } }).catch(() => {
    /* saved job remains queued */
  });
  return saved;
}
