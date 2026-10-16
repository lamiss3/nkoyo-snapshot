import assert from "node:assert/strict";
import test from "node:test";
import { validateReviewCases } from "./fixtures/email-v3-review-cases.mjs";
import { fictionalOutput } from "./fixtures/email-v3-fictional.mjs";
import { emailJourneyBrief } from "../src/assessment-v2/email-journey.ts";
import { emailJourneySystemInstruction } from "../src/assessment-v2/email-journey.server.ts";
import { runIsolatedEmailReview, customerReviewHtml } from "../scripts/lib/email-v3-review.mjs";

const mockOutput = () => {
  const output = structuredClone(fictionalOutput);
  for (const email of output.emails)
    for (const section of email.sections)
      section.sourceQuestionIds = section.sourceQuestionIds.map((id) =>
        id === "probe_p04" ? "q9" : "q11",
      );
  return output;
};
const mockResponse = (content) =>
  new Response(
    JSON.stringify({
      modelVersion: "mocked-development-test-not-live",
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: JSON.stringify(content) }] } },
      ],
    }),
  );

test("three fictional review inputs pass app validation and preserve distinct evidence conditions", () => {
  const cases = validateReviewCases();
  assert.equal(cases.length, 3);
  const briefs = cases.map((c) => emailJourneyBrief(c.session));
  assert.equal(briefs[0].topics[0].evidence, "supported");
  assert.equal(briefs[0].topics[1].evidence, "possible");
  assert.equal(
    briefs[0].responses.find((r) => r.questionId === "q9").evidenceUse,
    "hypothetical_match",
  );
  assert.equal(briefs[1].sparseEvidence, true);
  assert.equal(briefs[2].secondaryId, null);
  assert.ok(cases.every((c) => !c.session.traceToken));
});

test("local review harness makes one guarded model POST and uses real validation/renderers with no key in artifacts", async () => {
  let calls = 0;
  const output = mockOutput();
  const result = await runIsolatedEmailReview(
    { apiKey: "private-test-key", model: "gemini-test", transport: "google" },
    async (url, init) => {
      calls++;
      assert.equal(
        url,
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
      );
      assert.equal(init.method, "POST");
      assert.equal(init.redirect, "error");
      assert.equal(init.headers["x-goog-api-key"], "private-test-key");
      const request = JSON.parse(init.body);
      assert.equal(request.contents.length, 1);
      assert.ok(request.contents[0].parts[0].text.includes("Closest hypothetical match selected"));
      return mockResponse(output);
    },
  );
  assert.equal(calls, 1);
  assert.equal(result.networkRequests, 1);
  assert.equal(result.status, "validated");
  assert.deepEqual(result.structuredResponse, output);
  assert.deepEqual(
    result.journey.emails.map((e) => e.sections),
    output.emails.map((e) => e.sections),
  );
  assert.ok(!JSON.stringify(result).includes("private-test-key"));
  const html = customerReviewHtml(result);
  assert.ok(html.includes("FICTIONAL INPUT"));
  assert.ok(!html.includes("Staff evidence references"));
  assert.ok(!html.includes("shares describe relative emphasis"));
});

test("failed provider/validation runs retain actual response and do not retry or substitute copy", async () => {
  for (const failure of ["http", "validation"]) {
    let calls = 0;
    const invalid = mockOutput();
    invalid.emails[0].mainAction = "Review probe_p03";
    const result = await runIsolatedEmailReview(
      { apiKey: "private-key", model: "gemini-test" },
      async () => {
        calls++;
        return failure === "http"
          ? new Response(
              JSON.stringify({ error: { message: "private-key rejected", code: 403 } }),
              { status: 403 },
            )
          : mockResponse(invalid);
      },
    );
    assert.equal(calls, 1);
    assert.equal(result.status, "failed");
    assert.equal(result.journey, null);
    assert.equal(result.customerHtml, null);
    assert.throws(() => customerReviewHtml(result), /never substitute/);
    if (failure === "http") assert.equal(result.providerError.message, "[REDACTED] rejected");
    else assert.deepEqual(result.structuredResponse, invalid);
    assert.ok(!JSON.stringify(result).includes("private-key"));
  }
});

test("writing instructions include new observation tools and separate branch paragraphs without changing schema fields", () => {
  assert.ok(
    emailJourneySystemInstruction.includes(
      "Keep all evidence rules, safety limits and generation-process precautions INTERNAL",
    ),
  );
  assert.ok(emailJourneySystemInstruction.includes("NEW way to record or compare observations"));
  assert.ok(emailJourneySystemInstruction.includes("one per paragraphs[] entry"));
  assert.ok(
    emailJourneyBrief(validateReviewCases()[0].session).topics.every(
      (t) => t.guide.advisory.obstacleTool,
    ),
  );
  // Prompt checks show instructions are passed. They do not prove a model follows them.
});
