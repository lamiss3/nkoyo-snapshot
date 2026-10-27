import { createHash } from "node:crypto";
import { creditStatus, type CreditsResult } from "./credits.ts";

type Environment = Record<string, string | undefined>;
type Totals = { totalCredits: number; totalUsage: number };
type Cache = {
  fingerprint: string;
  totals: Totals | null;
  lastSuccess: number | null;
  lastAttempt: number | null;
  expiresAt: number;
  pending: Promise<void> | null;
};
const MANUAL_COOLDOWN = 30_000;
const FAILURE_BACKOFF = 60_000;

export function creditsConfig(env: Environment) {
  const number = (name: string, fallback: number) => {
    const raw = env[name]?.trim();
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };
  const low = number("OPENROUTER_CREDITS_LOW_THRESHOLD", 10);
  const critical = number("OPENROUTER_CREDITS_CRITICAL_THRESHOLD", 3);
  return {
    thresholds: critical <= low ? { low, critical } : { low: 10, critical: 3 },
    cacheMs: Math.min(600, Math.max(300, number("OPENROUTER_CREDITS_CACHE_SECONDS", 450))) * 1000,
  };
}

// Only allowlisted numeric values leave this module. Never return/log upstream errors or headers.
export function createCreditsService({
  environment = () => process.env,
  fetcher = fetch,
  now = Date.now,
}: {
  environment?: () => Environment;
  fetcher?: typeof fetch;
  now?: () => number;
} = {}) {
  let cache: Cache | null = null;
  return async function loadCredits(force = false): Promise<CreditsResult> {
    const env = environment();
    const config = creditsConfig(env);
    const key = env["OPENROUTER_MANAGEMENT_KEY"]?.trim();
    if (!key) {
      cache = null;
      return {
        available: false,
        thresholds: config.thresholds,
        lastSuccessfulRefresh: null,
        nextManualRefreshAt: null,
      };
    }
    const fingerprint = createHash("sha256").update(key).digest("hex");
    if (!cache || cache.fingerprint !== fingerprint) {
      cache = {
        fingerprint,
        totals: null,
        lastSuccess: null,
        lastAttempt: null,
        expiresAt: 0,
        pending: null,
      };
    }
    const state = cache;
    const time = now();
    const refreshAllowed =
      state.lastAttempt === null || time - state.lastAttempt >= MANUAL_COOLDOWN;
    if (!state.pending && (time >= state.expiresAt || (force && refreshAllowed))) {
      state.lastAttempt = time;
      state.pending = (async () => {
        try {
          const response = await fetcher("https://openrouter.ai/api/v1/credits", {
            method: "GET",
            headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
            cache: "no-store",
            redirect: "error",
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw new Error("Unavailable");
          const body: unknown = await response.json();
          const data = body && typeof body === "object" && "data" in body ? body.data : null;
          if (
            !data ||
            typeof data !== "object" ||
            !("total_credits" in data) ||
            !("total_usage" in data)
          )
            throw new Error("Unavailable");
          const purchased = data.total_credits;
          const usage = data.total_usage;
          if (
            typeof purchased !== "number" ||
            !Number.isFinite(purchased) ||
            purchased < 0 ||
            typeof usage !== "number" ||
            !Number.isFinite(usage) ||
            usage < 0 ||
            !Number.isFinite(purchased - usage)
          )
            throw new Error("Unavailable");
          state.totals = { totalCredits: purchased, totalUsage: usage };
          state.lastSuccess = now();
          state.expiresAt = now() + config.cacheMs;
        } catch {
          // An expired/failed balance is unavailable, never a stale amount presented as current.
          state.totals = null;
          state.expiresAt = now() + FAILURE_BACKOFF;
        }
      })().finally(() => {
        state.pending = null;
      });
    }
    await state.pending;
    const common = {
      thresholds: config.thresholds,
      lastSuccessfulRefresh:
        state.lastSuccess === null ? null : new Date(state.lastSuccess).toISOString(),
      nextManualRefreshAt:
        state.lastAttempt === null
          ? null
          : new Date(state.lastAttempt + MANUAL_COOLDOWN).toISOString(),
    };
    if (!state.totals) return { available: false, ...common };
    const remaining = state.totals.totalCredits - state.totals.totalUsage;
    return {
      available: true,
      ...state.totals,
      remaining,
      status: creditStatus(remaining, config.thresholds),
      ...common,
    };
  };
}

export const loadCredits = createCreditsService();
