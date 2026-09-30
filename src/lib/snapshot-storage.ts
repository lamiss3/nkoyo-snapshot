/** Local draft saving so progress survives a refresh. */

import type { Answers, DeepDiveAnswers } from "./snapshot-engine";
import type { DimensionId } from "@/config/questions";

// A new key prevents a partially completed 12-question draft from entering the
// revised nine-question journey with mismatched answers.
const KEY = "iis-readiness-snapshot-v2";

export interface SnapshotDraft {
  sessionKey: string;
  answers: Answers;
  deepDiveAnswers: DeepDiveAnswers;
  focusDimension: DimensionId | null;
  stepIndex: number;
  completedAt: string | null;
  updatedAt: string;
}

export function newSessionKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function emptyDraft(): SnapshotDraft {
  return {
    sessionKey: newSessionKey(),
    answers: {},
    deepDiveAnswers: {},
    focusDimension: null,
    stepIndex: 0,
    completedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

export function loadDraft(): SnapshotDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SnapshotDraft;
    if (!parsed || typeof parsed.sessionKey !== "string") return null;
    return {
      ...emptyDraft(),
      ...parsed,
      answers: parsed.answers ?? {},
      deepDiveAnswers: parsed.deepDiveAnswers ?? {},
      focusDimension: parsed.focusDimension ?? null,
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: SnapshotDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() }),
    );
  } catch {
    /* storage unavailable — the assessment still works in-memory */
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
