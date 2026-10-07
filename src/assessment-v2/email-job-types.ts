import type { Json } from "../integrations/supabase/types";
import type { TraceDatabase } from "./trace-types";
import type { EmailJourney } from "./email-journey";

export type EmailJob = {
  id: string;
  session_id: string;
  lead_id: string;
  email: string;
  followup_consent: boolean;
  consent_version: string;
  status: "queued" | "generating" | "draft" | "failed" | "cancelled";
  attempts: number;
  next_attempt_at: string;
  lock_token: string | null;
  locked_until: string | null;
  content: Json | null;
  kit_state: Json;
  last_error: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};
export interface KitDraftState {
  status?: "preparing" | "awaiting_recipient" | "drafts_ready" | "reconcile";
  subscriberId?: number;
  tagId?: number;
  messages?: { number: number; broadcastId: number }[];
  pendingNumber?: number;
  error?: string;
  testPreviews?: {
    number: number;
    broadcastId: number;
    recipient: string;
    verifiedAt: string;
    receivedAt?: string;
    mailbox?: "spam" | "inbox";
    verificationSource: string;
  }[];
}
export type EmailJobView = Omit<EmailJob, "lock_token" | "content" | "kit_state"> & {
  content: EmailJourney | null;
  kit_state: KitDraftState;
};
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type EmailDatabase = Omit<TraceDatabase, "public"> & {
  public: Omit<TraceDatabase["public"], "Tables" | "Functions"> & {
    Tables: TraceDatabase["public"]["Tables"] & {
      email_journeys: Table<EmailJob>;
      email_journey_events: Table<{
        id: string;
        journey_id: string;
        event_type: string;
        actor_id: string | null;
        details: Json;
        created_at: string;
      }>;
    };
    Functions: TraceDatabase["public"]["Functions"] & {
      enqueue_email_journey: {
        Args: { p_session: string; p_email: string; p_consent: boolean };
        Returns: string;
      };
      claim_email_journey: { Args: { p_id?: string; p_retry?: boolean }; Returns: EmailJob[] };
      finish_email_journey: {
        Args: { p_id: string; p_lock: string; p_content: Json | null; p_error?: string };
        Returns: boolean;
      };
    };
  };
};
