import { kitJourneyDrafts, type EmailJourney } from "./email-journey.ts";
import type { KitDraftState } from "./email-job-types";

type Subscriber = { id: number; email_address: string; state: string };
function providerId(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1)
    throw new Error("Kit returned an invalid resource ID.");
  return value;
}
export function assertSingleKitRecipient(
  payload: { subscribers?: Subscriber[]; pagination?: { has_next_page?: boolean } },
  id: number,
  email: string,
) {
  const members = payload.subscribers;
  if (
    payload.pagination?.has_next_page !== false ||
    members?.length !== 1 ||
    members[0]!.id !== id ||
    members[0]!.email_address.toLowerCase() !== email.toLowerCase() ||
    members[0]!.state !== "active"
  ) {
    throw new Error(
      "Kit recipient verification failed. The private tag must contain exactly one active intended recipient.",
    );
  }
}

/** Creates unscheduled PRIVATE drafts only. An uncertain POST is never retried. */
export async function prepareKitDrafts(config: {
  apiKey: string;
  sender: string;
  templateId: number;
  email: string;
  consent: boolean;
  journey: EmailJourney;
  state: KitDraftState;
  fetcher?: typeof fetch;
  pause?: (milliseconds: number) => Promise<void>;
  save: (state: KitDraftState) => Promise<void>;
  audit: (event: string, details: unknown) => Promise<void>;
}) {
  if (config.state.status === "drafts_ready") return config.state;
  if (
    config.state.pendingNumber ||
    config.state.status === "preparing" ||
    config.state.status === "reconcile"
  )
    throw new Error(
      "A previous Kit attempt needs reconciliation. Check Kit before creating more drafts.",
    );
  const resume = config.state.status === "awaiting_recipient";
  if (resume) {
    providerId(config.state.subscriberId);
    providerId(config.state.tagId);
  }
  const state: KitDraftState = resume
    ? { ...config.state, status: "preparing", messages: [...(config.state.messages ?? [])] }
    : { status: "preparing", messages: [] };
  delete state.error;
  // This durable marker precedes any provider side effect.
  await config.save(state);
  const api = async <T>(path: string, method: string, body?: unknown): Promise<T> => {
    await config.audit("kit_request", { path, method, body: body ?? null });
    const response = await (config.fetcher ?? fetch)(`https://api.kit.com/v4/${path}`, {
      method,
      headers: { "X-Kit-Api-Key": config.apiKey, "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20000),
    });
    const payload: unknown = await response.json();
    await config.audit("kit_response", { path, httpStatus: response.status, body: payload });
    if (!response.ok) throw new Error(`Kit request failed (${response.status}).`);
    return payload as T;
  };
  try {
    if (!resume) {
      const contact = await api<{ subscriber: Subscriber }>("subscribers", "POST", {
        email_address: config.email,
      });
      const subscriber = contact.subscriber;
      state.subscriberId = providerId(subscriber?.id);
      if (
        subscriber.email_address.toLowerCase() !== config.email.toLowerCase() ||
        subscriber.state !== "active"
      )
        throw new Error(
          "Kit contact is not active. Existing unsubscribed contacts are not reactivated.",
        );
      await config.save(state);
      const tag = await api<{ tag: { id: number } }>("tags", "POST", {
        name: `nkoyo-private-${config.journey.sessionId}`,
      });
      state.tagId = providerId(tag.tag?.id);
      await config.save(state);
      await api(`tags/${state.tagId}/subscribers/${state.subscriberId}`, "POST", {});
    }
    for (const draft of kitJourneyDrafts(config.journey, providerId(state.tagId), config.consent)) {
      if (state.messages!.some((message) => message.number === draft.emailNumber)) continue;
      // Recheck membership before EVERY personalized body is uploaded.
      for (let attempt = 0; attempt < 5; attempt++) {
        const members = await api<{
          subscribers: Subscriber[];
          pagination: { has_next_page: boolean };
        }>(`tags/${state.tagId}/subscribers?status=all&per_page=2`, "GET");
        // Kit acknowledges tagging before its subscriber index is updated.
        // Retry only an explicitly empty, complete page; other mismatches fail closed.
        if (members.subscribers?.length === 0 && members.pagination?.has_next_page === false) {
          if (attempt < 4) {
            await (
              config.pause ??
              ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)))
            )(Math.min(500 * 2 ** attempt, 2000));
            continue;
          }
          state.status = "awaiting_recipient";
          state.error =
            "Kit is still indexing the contact's tag. Remaining drafts are paused. Wait a few minutes, then retry recipient verification.";
          await config.save(state);
          return state;
        }
        assertSingleKitRecipient(members, providerId(state.subscriberId), config.email);
        break;
      }
      state.pendingNumber = draft.emailNumber;
      await config.save(state);
      const result = await api<{
        broadcast: { id: number; public: boolean; send_at: string | null };
      }>("broadcasts", "POST", {
        ...draft.payload,
        email_address: config.sender,
        email_template_id: config.templateId,
      });
      const broadcast = result.broadcast;
      // Keep the ID even if Kit's sending fields do not match; staff must reconcile it.
      state.messages!.push({ number: draft.emailNumber, broadcastId: providerId(broadcast?.id) });
      delete state.pendingNumber;
      await config.save(state);
      if (broadcast.public !== false || broadcast.send_at !== null)
        throw new Error(
          "Kit did not confirm an unscheduled private draft. Review this broadcast in Kit.",
        );
    }
    state.status = "drafts_ready";
    await config.save(state);
    return state;
  } catch (error) {
    state.status = "reconcile";
    state.error =
      error instanceof Error && /^Kit /.test(error.message)
        ? error.message.slice(0, 240)
        : "Kit preparation did not complete. Check the provider records before retrying.";
    await config.save(state);
    throw new Error(state.error);
  }
}
