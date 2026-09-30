import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/brand/Logo";
import { AdaptiveSnapshotPage } from "@/components/snapshot/AdaptiveSnapshotPage";
import {
  answerOptions,
  assessmentMeta,
  deepDiveQuestions,
  dimensions,
  questions,
  type AnswerId,
  type DimensionId,
} from "@/config/questions";
import { buildResult, leadQuestion, suggestedFocusDimension } from "@/lib/snapshot-engine";
import { clearDraft, emptyDraft, loadDraft, newSessionKey, saveDraft, type SnapshotDraft } from "@/lib/snapshot-storage";
import { logEvent, recordCompletedSnapshot } from "@/lib/snapshot-api";

export const Route = createFileRoute("/snapshot")({
  head: () => ({
    meta: [
      { title: "Take the Snapshot | Institutional Readiness Snapshot" },
      { name: "description", content: "Explore Culture, Capacity and Compliance through an adaptive assessment." },
      { property: "og:title", content: "Take the Institutional Readiness Snapshot" },
      { property: "og:description", content: "Explore Culture, Capacity and Compliance through an adaptive question flow." },
    ],
  }),
  component: AdaptiveSnapshotPage,
});

function SnapshotPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<SnapshotDraft | null>(null);
  const [resumed, setResumed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const existing = loadDraft();
    if (existing && (Object.keys(existing.answers).length > 0 || Object.keys(existing.deepDiveAnswers).length > 0)) {
      setDraft(existing);
      setResumed(true);
    } else {
      const fresh = emptyDraft();
      setDraft(fresh);
      saveDraft(fresh);
      void logEvent("snapshot_started", fresh.sessionKey);
    }
  }, []);

  const update = (patch: Partial<SnapshotDraft>) => {
    setDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
      saveDraft(next);
      return next;
    });
  };

  if (!draft) {
    return <div className="flex min-h-dvh items-center justify-center bg-blush"><Loader2 className="h-6 w-6 animate-spin text-magenta" aria-label="Loading" /></div>;
  }

  const stepIndex = Math.min(draft.stepIndex, assessmentMeta.questionCount - 1);
  const isDeepDive = stepIndex >= questions.length;
  const screeningQuestion = isDeepDive ? null : questions[stepIndex]!;
  const deepQuestion = isDeepDive ? deepDiveQuestions[stepIndex - questions.length]! : null;
  const focusDimension = draft.focusDimension ?? suggestedFocusDimension(draft.answers);
  const focusMeta = dimensions.find((d) => d.id === focusDimension)!;
  const suggestedMeta = dimensions.find((d) => d.id === suggestedFocusDimension(draft.answers))!;
  const focusTopic = leadQuestion(focusDimension, draft.answers).topic;
  const currentDimension = screeningQuestion?.dimension ?? focusDimension;
  const dimensionMeta = dimensions.find((d) => d.id === currentDimension)!;
  const currentAnswer = screeningQuestion
    ? draft.answers[screeningQuestion.id]
    : deepQuestion ? draft.deepDiveAnswers[deepQuestion.id] : "";
  const canContinue = Boolean(currentAnswer?.trim());
  const answeredCount = questions.filter((q) => draft.answers[q.id]).length +
    deepDiveQuestions.filter((q) => draft.deepDiveAnswers[q.id]?.trim()).length;
  const progress = Math.round((answeredCount / assessmentMeta.questionCount) * 100);

  const selectAnswer = (value: AnswerId) => {
    if (!screeningQuestion) return;
    update({
      answers: { ...draft.answers, [screeningQuestion.id]: value },
      focusDimension: null,
      deepDiveAnswers: {},
      completedAt: null,
      sessionKey: draft.completedAt ? newSessionKey() : draft.sessionKey,
    });
  };

  const setWrittenAnswer = (value: string) => {
    if (!deepQuestion) return;
    update({
      deepDiveAnswers: { ...draft.deepDiveAnswers, [deepQuestion.id]: value },
      completedAt: null,
      sessionKey: draft.completedAt ? newSessionKey() : draft.sessionKey,
    });
  };

  const selectFocus = (dimension: DimensionId) => {
    if (dimension === focusDimension) return;
    update({ focusDimension: dimension, deepDiveAnswers: {}, completedAt: null, sessionKey: draft.completedAt ? newSessionKey() : draft.sessionKey });
  };

  const finish = async () => {
    if (draft.completedAt) {
      void navigate({ to: "/results" });
      return;
    }
    setSubmitting(true);
    const result = buildResult(draft.answers, draft.deepDiveAnswers, focusDimension);
    try {
      await recordCompletedSnapshot({
        sessionKey: draft.sessionKey,
        answers: draft.answers,
        deepDiveAnswers: draft.deepDiveAnswers,
        patternKeys: result.patternKeys,
        summaryKey: result.summaryKey,
      });
    } catch {
      toast.error("We couldn't save your snapshot, but your results are ready below.");
    }
    update({ completedAt: new Date().toISOString(), stepIndex });
    setSubmitting(false);
    void navigate({ to: "/results" });
  };

  const goForward = () => {
    if (!canContinue) return;
    if (stepIndex < assessmentMeta.questionCount - 1) {
      update({ stepIndex: stepIndex + 1 });
    } else if (questions.every((q) => draft.answers[q.id]) && deepDiveQuestions.every((q) => draft.deepDiveAnswers[q.id]?.trim())) {
      void finish();
    }
  };

  const restart = () => {
    clearDraft();
    const fresh = emptyDraft();
    setDraft(fresh);
    saveDraft(fresh);
    setResumed(false);
    void logEvent("snapshot_restarted", fresh.sessionKey);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-blush">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto grid max-w-4xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center"><Logo /></div>
          <button type="button" onClick={restart} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-navy transition-colors hover:bg-secondary">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restart
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        {resumed && <div role="status" className="mb-6 rounded-2xl border border-magenta/30 bg-card px-5 py-4 text-sm">We loaded your saved answers. You can review them, continue, or restart.</div>}

        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow text-magenta">{isDeepDive ? `A closer look at ${focusMeta.name}` : dimensionMeta.name}</p>
            <p className="text-sm font-semibold text-muted-foreground">Question {stepIndex + 1} of {assessmentMeta.questionCount}</p>
          </div>
          <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Snapshot progress" className="mt-3 h-3 w-full overflow-hidden rounded-full bg-blush-deep">
            <div className="h-full rounded-full bg-lime transition-all duration-300" style={{ width: `${Math.max(progress, 3)}%` }} />
          </div>
          <ol className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase tracking-widest">
            {[...dimensions.map((d) => d.name), "Deeper look"].map((name) => (
              <li key={name} aria-current={(isDeepDive ? name === "Deeper look" : name === dimensionMeta.name) ? "step" : undefined} className={`rounded-full px-3 py-1 ${(isDeepDive ? name === "Deeper look" : name === dimensionMeta.name) ? "bg-navy text-navy-foreground" : "bg-card text-muted-foreground"}`}>{name}</li>
            ))}
          </ol>
        </div>

        {isDeepDive && (
          <div className="mb-6 rounded-2xl border border-magenta/20 bg-card p-5">
            <p className="text-sm font-semibold">Your first nine answers suggest exploring {suggestedMeta.name.toLowerCase()}.</p>
            <p className="mt-1 text-sm text-muted-foreground">This is a starting point, not a diagnosis. Choose the area you want to explore more deeply.</p>
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Choose a focus area">
              {dimensions.map((dimension) => (
                <button key={dimension.id} type="button" onClick={() => selectFocus(dimension.id)} aria-pressed={focusDimension === dimension.id} className={`rounded-full border px-4 py-2 text-sm font-semibold ${focusDimension === dimension.id ? "border-navy bg-navy text-navy-foreground" : "border-border hover:border-magenta"}`}>
                  {dimension.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <section className="card-elevated p-7 sm:p-10">
          {isDeepDive && <p className="eyebrow mb-3 text-magenta">Your own context</p>}
          <h1 className="text-2xl font-black leading-snug sm:text-3xl">
            {screeningQuestion?.text ?? deepQuestion?.prompt(focusMeta.name, focusTopic)}
          </h1>
          {deepQuestion && (
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{deepQuestion.helper} Your written response is saved when you finish. Please avoid names or confidential details. <Link to="/privacy" className="underline underline-offset-4">Privacy details</Link></p>
          )}

          {screeningQuestion ? (
            <fieldset className="mt-8">
              <legend className="sr-only">{screeningQuestion.text}</legend>
              <div className="space-y-3">
                {answerOptions.map((option) => (
                  <label key={option.id} className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 px-5 py-4 transition-colors ${currentAnswer === option.id ? "border-magenta bg-blush" : "border-border bg-card hover:border-magenta/50"}`}>
                    <input type="radio" name={screeningQuestion.id} value={option.id} checked={currentAnswer === option.id} onChange={() => selectAnswer(option.id)} className="h-5 w-5 shrink-0 accent-[oklch(0.65_0.266_335.4)]" />
                    <span className="flex min-w-0 items-baseline gap-3"><span className="font-display text-sm font-black text-magenta">{option.letter}</span><span className="font-medium">{option.label}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : deepQuestion ? (
            <div className="mt-8">
              <label htmlFor={deepQuestion.id} className="sr-only">{deepQuestion.prompt(focusMeta.name, focusTopic)}</label>
              <textarea id={deepQuestion.id} value={draft.deepDiveAnswers[deepQuestion.id] ?? ""} onChange={(event) => setWrittenAnswer(event.target.value)} maxLength={800} rows={6} placeholder="Write a sentence or two..." className="w-full resize-y rounded-2xl border-2 border-border bg-card px-5 py-4 text-base leading-relaxed outline-none focus:border-magenta" />
              <p className="mt-2 text-right text-xs text-muted-foreground">{(draft.deepDiveAnswers[deepQuestion.id] ?? "").length}/800 characters</p>
            </div>
          ) : null}
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={() => update({ stepIndex: Math.max(stepIndex - 1, 0) })} disabled={stepIndex === 0} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-6 font-semibold transition-colors hover:bg-secondary disabled:opacity-40"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back</button>
          <button type="button" onClick={goForward} disabled={!canContinue || submitting} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-magenta px-8 font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Preparing results</> : <>{stepIndex === assessmentMeta.questionCount - 1 ? "See my results" : "Continue"}<ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">Your progress saves automatically on this device. <Link to="/" className="underline underline-offset-4 hover:text-magenta">Back to home</Link></p>
      </main>
    </div>
  );
}
