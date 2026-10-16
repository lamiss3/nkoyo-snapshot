// Deliberately imports generation, rendering and local fixtures only: no jobs, DB or Kit modules.
import { createGeminiEmailJourneyWriter } from "../../src/assessment-v2/email-journey.server.ts";
import {
  emailJourneyBrief,
  journeyEmailHtml,
  journeyEmailText,
} from "../../src/assessment-v2/email-journey.ts";
import { traceJson } from "../../src/assessment-v2/provider-trace.server.ts";
import { paragraphWordCount } from "../../src/assessment-v2/email-validation.ts";
import { validateReviewCases } from "../../tests/fixtures/email-v3-review-cases.mjs";

export const isolationNotice =
  "FICTIONAL INPUT — isolated development generation review. No subscribers, Kit uploads, jobs, email sends or production writes. Model copy is retained without manual edits. Structural validation does not establish editorial quality.";

/** One actual application writer invocation, with a guarded single-endpoint fetch and local recorder.
 * The injected fetcher is for deterministic tests. The CLI passes the native fetch unchanged. */
export async function runIsolatedEmailReview(config, fetcher = globalThis.fetch) {
  const cases = validateReviewCases();
  const session = cases[0].session;
  const expectedUrl =
    config.transport === "openrouter"
      ? "https://openrouter.ai/api/v1/chat/completions"
      : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model ?? "gemini-3.6-flash")}:generateContent`;
  let requests = 0;
  let requestBody = null;
  let finish = null;
  let journey = null;
  let error = null;
  const redact = (data) => traceJson(data, [config.apiKey]);
  try {
    const writer = createGeminiEmailJourneyWriter({
      ...config,
      trace: {
        async start(spec) {
          requestBody = redact(spec.request);
          return "local-only";
        },
        async finish(_id, data) {
          finish = redact(data);
        },
      },
      fetcher: async (url, init) => {
        if (String(url) !== expectedUrl || init?.method !== "POST" || requests !== 0)
          throw new Error(
            "Isolated review blocked a second request or an unapproved endpoint/method",
          );
        requests++;
        return fetcher(url, { ...init, redirect: "error" });
      },
    });
    journey = await writer.generate(session);
  } catch (e) {
    error = redact({
      name: e.name,
      message: e.message,
      ...(e.cause ? { cause: { code: e.cause.code, message: e.cause.message } } : {}),
    });
  }
  const providerBody = finish?.response?.body;
  const modelText =
    config.transport === "openrouter"
      ? providerBody?.choices?.[0]?.message?.content
      : providerBody?.candidates?.[0]?.content?.parts
          ?.filter((p) => !p.thought)
          .map((p) => p.text ?? "")
          .join("");
  let structuredResponse = null;
  if (typeof modelText === "string") {
    try {
      structuredResponse = JSON.parse(modelText);
    } catch {
      /* retain exact text on failure */
    }
  }
  return redact({
    notice: isolationNotice,
    status: journey ? "validated" : "failed",
    transport: config.transport ?? "google",
    configuredModel: config.model,
    responseModel: finish?.response_model ?? null,
    networkRequests: requests,
    httpStatus: finish?.http_status ?? null,
    usage: finish?.usage ?? null,
    error,
    providerError: providerBody?.error ?? null,
    nonJsonFailureResponse: !providerBody ? (finish?.response?.raw ?? null) : null,
    request: requestBody,
    modelText: typeof modelText === "string" ? modelText : null,
    structuredResponse,
    journey,
    paragraphWords: journey?.emails.map(paragraphWordCount) ?? null,
    // Explicit version preserves historical renderers while selecting the v3 scope note.
    customerText: journey?.emails.map((e) => journeyEmailText(e, journey.version)) ?? null,
    customerHtml: journey?.emails.map((e) => journeyEmailHtml(e, journey.version)) ?? null,
    fictionalInput: { label: cases[0].label, session, generationBrief: emailJourneyBrief(session) },
  });
}

const escape = (text) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export function customerReviewHtml(review) {
  if (!review.journey)
    throw new Error("No validated journey to render; never substitute manual copy");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Actual model output on fictional input</title><style>body{margin:0;background:#fff7fc;color:#17245a;font:17px/1.65 system-ui,sans-serif}main{max-width:760px;margin:40px auto;padding:0 22px}article{margin:28px 0;padding:28px;background:white;border:1px solid #eadce9;border-radius:20px}h1{font-size:28px;line-height:1.25}h2{font-size:21px;line-height:1.35}.notice{padding:18px;border-left:4px solid #d11aab;background:white}a{color:#9f147c}</style></head><body><main><h1>Actual model output on fictional input</h1><p class="notice">${escape(isolationNotice)}</p><p>${escape(review.responseModel ?? review.configuredModel)} — ${escape(review.transport)}</p>${review.journey.emails.map((email, i) => `<article><small>Email ${email.number}</small><h1>${escape(email.subject)}</h1><p>${escape(email.preview)}</p>${review.customerHtml[i]}</article>`).join("")}</main></body></html>`;
}
