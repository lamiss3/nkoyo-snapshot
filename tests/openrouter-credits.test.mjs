import test from "node:test";
import assert from "node:assert/strict";
import { createCreditsService, creditsConfig } from "../src/admin/credits-service.server.ts";
import {
  createCreditsAuthorization,
  createCreditsHandler,
} from "../src/admin/credits-http.server.ts";
import { creditStatus, creditsResultSchema } from "../src/admin/credits.ts";

const secret = "management-test-secret-never-public";
const request = (token = "valid-token", refresh = false) =>
  new Request(`http://localhost/api/admin/openrouter-credits${refresh ? "?refresh=1" : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
function fixture(
  response = () => Response.json({ data: { total_credits: 25, total_usage: 4.125 } }),
) {
  let time = 1_000_000;
  let calls = 0;
  const env = { OPENROUTER_MANAGEMENT_KEY: secret };
  const load = createCreditsService({
    environment: () => env,
    now: () => time,
    fetcher: async (url, options) => {
      calls++;
      assert.equal(url, "https://openrouter.ai/api/v1/credits");
      assert.equal(options.method, "GET");
      assert.equal(options.headers.Authorization, `Bearer ${env.OPENROUTER_MANAGEMENT_KEY}`);
      assert.equal(options.redirect, "error");
      return response();
    },
  });
  return {
    load,
    env,
    advance: (ms) => {
      time += ms;
    },
    calls: () => calls,
  };
}

test("credits use a dedicated key, allowlisted totals, exact subtraction and successful refresh time", async () => {
  const f = fixture(() =>
    Response.json({
      data: { total_credits: 25, total_usage: 4.125, key: secret },
      private: secret,
    }),
  );
  const result = await f.load();
  assert.equal(result.available, true);
  assert.equal(result.remaining, 20.875);
  assert.equal(result.status, "healthy");
  assert.equal(result.lastSuccessfulRefresh, new Date(1_000_000).toISOString());
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.deepEqual(creditsResultSchema.parse(result), result);
});

test("missing management key never falls back to an inference key or an invented zero", async () => {
  const f = fixture();
  delete f.env.OPENROUTER_MANAGEMENT_KEY;
  f.env.OPENROUTER_API_KEY = "inference-key-only";
  const result = await f.load();
  assert.equal(f.calls(), 0);
  assert.equal(result.available, false);
  assert.equal("remaining" in result, false);
  assert.equal(result.lastSuccessfulRefresh, null);
});

test("healthy, low and critical boundaries include exactly $3 and $10 in low", () => {
  const limits = { low: 10, critical: 3 };
  for (const [balance, expected] of [
    [10.01, "healthy"],
    [10, "low"],
    [3, "low"],
    [2.99, "critical"],
    [0, "critical"],
    [-1, "critical"],
  ])
    assert.equal(creditStatus(balance, limits), expected);
});

test("thresholds are configurable, invalid values fall back, cache stays within 5–10 minutes", () => {
  assert.deepEqual(creditsConfig({}).thresholds, { low: 10, critical: 3 });
  assert.deepEqual(
    creditsConfig({
      OPENROUTER_CREDITS_LOW_THRESHOLD: "20",
      OPENROUTER_CREDITS_CRITICAL_THRESHOLD: "5",
    }).thresholds,
    { low: 20, critical: 5 },
  );
  assert.deepEqual(
    creditsConfig({
      OPENROUTER_CREDITS_LOW_THRESHOLD: "1",
      OPENROUTER_CREDITS_CRITICAL_THRESHOLD: "3",
    }).thresholds,
    { low: 10, critical: 3 },
  );
  assert.equal(creditsConfig({ OPENROUTER_CREDITS_CACHE_SECONDS: "0" }).cacheMs, 300_000);
  assert.equal(creditsConfig({ OPENROUTER_CREDITS_CACHE_SECONDS: "9999" }).cacheMs, 600_000);
  assert.equal(creditsConfig({ OPENROUTER_CREDITS_CACHE_SECONDS: "invalid" }).cacheMs, 450_000);
});

test("cache serves repeated reads for 7.5 minutes, then refreshes", async () => {
  const f = fixture();
  await f.load();
  f.advance(449_999);
  await f.load();
  assert.equal(f.calls(), 1);
  f.advance(1);
  await f.load();
  assert.equal(f.calls(), 2);
});

test("manual refresh bypasses fresh cache only after the 30-second throttle", async () => {
  const f = fixture();
  await f.load();
  await f.load(true);
  assert.equal(f.calls(), 1);
  f.advance(30_000);
  await f.load(true);
  assert.equal(f.calls(), 2);
});

test("parallel reads and refresh clicks share one upstream request", async () => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const f = fixture(async () => {
    await gate;
    return Response.json({ data: { total_credits: 5, total_usage: 1 } });
  });
  const pending = Array.from({ length: 12 }, () => f.load(true));
  assert.equal(f.calls(), 1);
  release();
  const results = await Promise.all(pending);
  assert.equal(
    results.every((value) => value.available && value.remaining === 4),
    true,
  );
});

test("management key rotation invalidates the previous account cache", async () => {
  const f = fixture();
  await f.load();
  f.env.OPENROUTER_MANAGEMENT_KEY = "different-account-management-key";
  await f.load();
  assert.equal(f.calls(), 2);
  delete f.env.OPENROUTER_MANAGEMENT_KEY;
  assert.equal((await f.load()).available, false);
});

for (const status of [401, 403, 429, 500]) {
  test(`upstream ${status} is sanitized and briefly cached as unavailable`, async () => {
    const f = fixture(() => Response.json({ error: { message: secret } }, { status }));
    const result = await f.load();
    assert.equal(result.available, false);
    assert.equal("remaining" in result, false);
    assert.equal(JSON.stringify(result).includes(secret), false);
    await f.load();
    assert.equal(f.calls(), 1);
    f.advance(60_000);
    await f.load();
    assert.equal(f.calls(), 2);
  });
}

test("timeout/network errors and malformed totals never become dollar amounts", async () => {
  for (const response of [
    () => {
      throw new Error(`Failed with ${secret}`);
    },
    () => new Response("not json"),
    () => Response.json({ data: { total_credits: "25", total_usage: 1 } }),
    () => Response.json({ data: { total_credits: -1, total_usage: 1 } }),
    () => Response.json({ data: { total_credits: 1 } }),
  ]) {
    const result = await fixture(response).load();
    assert.equal(result.available, false);
    assert.equal(JSON.stringify(result).includes(secret), false);
  }
});

test("a failed refresh hides stale totals but retains the last successful refresh time", async () => {
  let failed = false;
  const f = fixture(() =>
    failed
      ? new Response("failed", { status: 500 })
      : Response.json({ data: { total_credits: 3, total_usage: 1 } }),
  );
  const first = await f.load();
  failed = true;
  f.advance(450_000);
  const result = await f.load();
  assert.equal(result.available, false);
  assert.equal("totalCredits" in result, false);
  assert.equal(result.lastSuccessfulRefresh, first.lastSuccessfulRefresh);
});

test("genuine zero and negative remaining balances are preserved, not fabricated or clamped", async () => {
  for (const usage of [5, 6]) {
    const f = fixture(() => Response.json({ data: { total_credits: 5, total_usage: usage } }));
    const result = await f.load();
    assert.equal(result.available, true);
    assert.equal(result.remaining, 5 - usage);
    assert.equal(result.status, "critical");
  }
});

test("authorization verifies the bearer token and queries roles for the verified user ID", async () => {
  const calls = [];
  let roles = [{ role: "staff" }];
  const authorize = createCreditsAuthorization({
    getUser: async (token) => ({
      data: { user: token === "valid-token" ? { id: "verified-user" } : null },
      error: null,
    }),
    getRoles: async (user) => {
      calls.push(user);
      return { data: roles, error: null };
    },
  });
  assert.equal(await authorize(request(null)), "unauthenticated");
  assert.equal(await authorize(request("invalid-token")), "unauthenticated");
  assert.equal(calls.length, 0);
  assert.equal(await authorize(request()), "forbidden");
  roles = [{ role: "admin" }];
  assert.equal(await authorize(request()), "admin");
  assert.equal(calls[0], "verified-user");
});

test("role lookup failure fails closed without exposing balances or private errors", async () => {
  const authorize = createCreditsAuthorization({
    getUser: async () => ({ data: { user: { id: "user" } }, error: null }),
    getRoles: async () => {
      throw new Error(secret);
    },
  });
  assert.equal(await authorize(request()), "unavailable");
});

test("HTTP route rejects anonymous and staff users before reading even a warm balance cache", async () => {
  const f = fixture();
  let access = "admin";
  let reads = 0;
  const handler = createCreditsHandler({
    authorize: async () => access,
    load: async (force) => {
      reads++;
      return f.load(force);
    },
  });
  assert.equal((await handler(request())).status, 200);
  access = "forbidden";
  const staff = await handler(request());
  assert.equal(staff.status, 403);
  assert.deepEqual(await staff.json(), { available: false });
  access = "unauthenticated";
  assert.equal((await handler(request())).status, 401);
  assert.equal(reads, 1);
  assert.equal(f.calls(), 1);
});

test("HTTP responses are private/no-store, support manual refresh, and never echo private exceptions", async () => {
  const f = fixture();
  const handler = createCreditsHandler({ authorize: async () => "admin", load: f.load });
  const first = await handler(request());
  assert.equal(first.headers.get("cache-control"), "private, no-store");
  assert.equal(first.headers.get("vary"), "Authorization");
  f.advance(30_000);
  await handler(request("valid-token", true));
  assert.equal(f.calls(), 2);
  const failed = await createCreditsHandler({
    authorize: async () => {
      throw new Error(secret);
    },
    load: f.load,
  })(request());
  assert.equal(failed.status, 503);
  assert.deepEqual(await failed.json(), { available: false });
});
