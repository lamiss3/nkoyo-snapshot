import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  verifyEmailCapability,
  cronAuthorized,
  safeJobError,
} from "../src/assessment-v2/email-job-policy.server.ts";
import {
  prepareKitDrafts,
  assertSingleKitRecipient,
} from "../src/assessment-v2/kit-client.server.ts";
import { emailPurposes } from "../src/assessment-v2/email-journey.ts";

test("email ownership requires the saved capability, and the worker fails closed without its secret", () => {
  const token = "a".repeat(64),
    hash = createHash("sha256").update(token).digest("hex");
  verifyEmailCapability(token, hash);
  assert.throws(() => verifyEmailCapability("b".repeat(64), hash), /another session/);
  assert.throws(() => verifyEmailCapability(token, "bad"), /Invalid/);
  assert.equal(cronAuthorized("Bearer " + token, undefined), false);
  assert.equal(cronAuthorized("Bearer " + token, token), true);
  assert.equal(cronAuthorized("Bearer " + token + "extra", token), false);
  assert.ok(
    !safeJobError(new Error("private-api-key confidential response")).includes("private-api-key"),
  );
});
const subscriber = { id: 11, email_address: "test@example.com", state: "active" };
const membership = { subscribers: [subscriber], pagination: { has_next_page: false } };
const journey = {
  version: "email-journey-v1",
  sessionId: "test-session",
  generatedAt: "2026-10-06T09:00:00Z",
  emails: emailPurposes.map((purpose, index) => ({
    number: index + 1,
    purpose,
    subject: "Subject",
    preview: "Preview",
    sections: [
      { heading: "Thought", paragraphs: ["A useful observation."], sourceQuestionIds: [] },
    ],
  })),
};
function fixture(consent, fetcher) {
  const saves = [],
    audits = [];
  return {
    saves,
    audits,
    config: {
      apiKey: "private-kit-key",
      sender: "sender@example.com",
      templateId: 42,
      email: "test@example.com",
      consent,
      journey,
      state: {},
      fetcher,
      pause: async () => {},
      save: async (state) => saves.push(structuredClone(state)),
      audit: async (type, details) => audits.push({ type, details }),
    },
  };
}
function provider(requests) {
  return async (url, init) => {
    const path = url.replace("https://api.kit.com/v4/", "");
    const body = init.body ? JSON.parse(init.body) : null;
    requests.push({ path, method: init.method, body });
    assert.ok(!url.includes("private-kit-key"));
    if (path === "subscribers") return Response.json({ subscriber });
    if (path === "tags") return Response.json({ tag: { id: 22 } });
    if (path === "tags/22/subscribers/11") return Response.json({ subscriber });
    if (path.startsWith("tags/22/subscribers?")) return Response.json(membership);
    if (path === "broadcasts")
      return Response.json({
        broadcast: { id: 100 + requests.length, public: false, send_at: null },
      });
    throw new Error("Unexpected endpoint");
  };
}
test("Kit uploads only consented messages as private unscheduled drafts and verifies each recipient", async () => {
  for (const consent of [false, true]) {
    const requests = [],
      f = fixture(consent, provider(requests));
    const state = await prepareKitDrafts(f.config);
    const broadcasts = requests.filter((row) => row.path === "broadcasts");
    assert.equal(broadcasts.length, consent ? 5 : 1);
    assert.equal(
      requests.filter((row) => row.path.includes("status=all")).length,
      broadcasts.length,
    );
    for (const broadcast of broadcasts) {
      assert.equal(broadcast.body.public, false);
      assert.equal(broadcast.body.send_at, null);
      assert.deepEqual(broadcast.body.subscriber_filter, [{ all: [{ type: "tag", ids: [22] }] }]);
    }
    assert.equal(state.status, "drafts_ready");
    assert.equal(f.saves[0].status, "preparing");
    assert.ok(f.audits.some((row) => row.type === "kit_response"));
  }
});
test("extra, inactive or unverified recipients prevent uploading personalized broadcasts", async () => {
  for (const bad of [
    { ...membership, subscribers: [subscriber, { ...subscriber, id: 12 }] },
    { ...membership, pagination: { has_next_page: true } },
    { ...membership, subscribers: [{ ...subscriber, state: "cancelled" }] },
    { ...membership, pagination: {} },
  ])
    assert.throws(() => assertSingleKitRecipient(bad, 11, "test@example.com"));
  const requests = [],
    valid = provider(requests),
    f = fixture(true, async (url, init) =>
      url.includes("status=all")
        ? Response.json({ ...membership, subscribers: [subscriber, { ...subscriber, id: 12 }] })
        : valid(url, init),
    );
  await assert.rejects(prepareKitDrafts(f.config), /recipient verification/);
  assert.equal(requests.filter((row) => row.path === "broadcasts").length, 0);
  assert.equal(f.saves.at(-1).status, "reconcile");
});
test("uncertain broadcast POST is marked for reconciliation and never blindly retried", async () => {
  const requests = [],
    valid = provider(requests),
    f = fixture(true, async (url, init) => {
      if (url.endsWith("/broadcasts"))
        throw new Error("Network disconnected after server accepted request");
      return valid(url, init);
    });
  await assert.rejects(prepareKitDrafts(f.config), /did not complete/);
  const state = f.saves.at(-1);
  assert.equal(state.status, "reconcile");
  assert.equal(state.pendingNumber, 1);
  await assert.rejects(prepareKitDrafts({ ...f.config, state }), /needs reconciliation/);
  assert.equal(requests.filter((row) => row.path === "subscribers").length, 1);
});

test("Kit tag indexing can catch up through bounded reads, without loosening recipient checks", async () => {
  const requests = [],
    valid = provider(requests);
  let reads = 0,
    pauses = 0;
  const f = fixture(false, async (url, init) => {
    if (url.includes("status=all") && reads++ === 0)
      return Response.json({ ...membership, subscribers: [] });
    return valid(url, init);
  });
  f.config.pause = async () => {
    pauses++;
  };
  const result = await prepareKitDrafts(f.config);
  assert.equal(result.messages.length, 1);
  assert.equal(pauses, 1);
  assert.equal(reads, 2);
});

test("empty Kit index pauses durably and resumes without recreating resources or confirmed drafts", async () => {
  const requests = [],
    valid = provider(requests);
  let ready = false,
    reads = 0;
  const f = fixture(true, async (url, init) => {
    if (url.includes("status=all") && !ready && ++reads > 1)
      return Response.json({ ...membership, subscribers: [] });
    return valid(url, init);
  });
  const pending = await prepareKitDrafts(f.config);
  assert.equal(pending.status, "awaiting_recipient");
  assert.equal(pending.messages.length, 1);
  assert.ok(!pending.pendingNumber);
  ready = true;
  const completed = await prepareKitDrafts({ ...f.config, state: pending });
  assert.equal(completed.status, "drafts_ready");
  assert.equal(completed.messages.length, 5);
  assert.equal(requests.filter((row) => row.path === "subscribers").length, 1);
  assert.equal(requests.filter((row) => row.path === "tags").length, 1);
  assert.equal(requests.filter((row) => row.path === "broadcasts").length, 5);
  assert.equal(new Set(completed.messages.map((message) => message.number)).size, 5);
});

test("automatic Kit scheduling keeps consent and private targeting and resumes without duplicate sends", async () => {
  for (const consent of [true, false]) {
    const requests = [],
      valid = provider(requests);
    const f = fixture(consent, async (url, init) => {
      if (url.endsWith("/broadcasts")) {
        const body = JSON.parse(init.body);
        requests.push({ path: "broadcasts", method: init.method, body });
        return Response.json({
          broadcast: {
            id: 1000 + requests.length,
            public: false,
            send_at: body.send_at,
            status: "scheduled",
          },
        });
      }
      return valid(url, init);
    });
    const now = Date.parse("2026-10-07T12:00:00Z");
    const config = { ...f.config, schedule: true, now: () => now };
    const state = await prepareKitDrafts(config);
    assert.equal(state.status, "scheduled");
    const posts = requests.filter((r) => r.path === "broadcasts");
    assert.equal(posts.length, consent ? 5 : 1);
    posts.forEach((post, index) => {
      assert.equal(post.body.public, false);
      assert.deepEqual(post.body.subscriber_filter, [{ all: [{ type: "tag", ids: [22] }] }]);
      assert.equal(
        Date.parse(post.body.send_at),
        now + 120000 + [0, 2, 4, 7, 10][index] * 86400000,
      );
      assert.equal(state.messages[index].sendAt, post.body.send_at);
    });
    const count = requests.length;
    await prepareKitDrafts({ ...config, state });
    assert.equal(requests.length, count);
    await assert.rejects(
      prepareKitDrafts({ ...config, journey: { ...journey, source: "fixed_test" }, state: {} }),
      /cannot be automatically sent/,
    );
    await assert.rejects(
      prepareKitDrafts({ ...config, state: { status: "drafts_ready" } }),
      /cannot be automatically enrolled/,
    );
  }
});

test("Kit's second-precision timestamps do not falsely reject a confirmed private schedule", async () => {
  const requests = [],
    valid = provider(requests);
  const f = fixture(false, async (url, init) =>
    url.endsWith("/broadcasts")
      ? Response.json({
          broadcast: {
            id: 400,
            public: false,
            send_at: JSON.parse(init.body).send_at.replace(/\.\d{3}Z$/, "Z"),
            status: "scheduled",
          },
        })
      : valid(url, init),
  );
  const state = await prepareKitDrafts({
    ...f.config,
    schedule: true,
    now: () => Date.parse("2026-10-07T12:00:00.215Z"),
  });
  assert.equal(state.status, "scheduled");
  assert.equal(state.messages.length, 1);
});

test("index delays preserve the same automatic schedule and confirmed IDs; privacy mismatch stops the worker", async () => {
  const requests = [],
    valid = provider(requests);
  let ready = false;
  const f = fixture(true, async (url, init) => {
    if (url.includes("status=all") && !ready)
      return Response.json({ ...membership, subscribers: [] });
    if (url.endsWith("/broadcasts")) {
      const body = JSON.parse(init.body);
      requests.push({ path: "broadcasts", body });
      return Response.json({
        broadcast: { id: 200 + requests.length, public: false, send_at: body.send_at },
      });
    }
    return valid(url, init);
  });
  const config = { ...f.config, schedule: true, now: () => Date.parse("2026-10-07T12:00:00Z") };
  const pending = await prepareKitDrafts(config);
  assert.equal(pending.status, "awaiting_recipient");
  ready = true;
  const saved = await prepareKitDrafts({ ...config, state: pending });
  assert.equal(saved.status, "scheduled");
  assert.equal(saved.messages.length, 5);
  assert.equal(requests.filter((r) => r.path === "subscribers").length, 1);
  const bad = fixture(false, async (url, init) =>
    url.endsWith("/broadcasts")
      ? Response.json({
          broadcast: { id: 999, public: true, send_at: JSON.parse(init.body).send_at },
        })
      : valid(url, init),
  );
  await assert.rejects(
    prepareKitDrafts({ ...bad.config, schedule: true }),
    /requested private sending settings/,
  );
  assert.equal(bad.saves.at(-1).status, "reconcile");
  assert.equal(bad.saves.at(-1).messages[0].broadcastId, 999);
});
