import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { AdaptiveResultView } from "@/components/snapshot/AdaptiveResultView";
import { advanceAdaptiveAssessment, checkpointAdaptiveAssessment } from "@/assessment-v2/actions";
import { createAssessmentSession, questionsForStage, submitAssessmentAnswer } from "@/assessment-v2/orchestrator";
import type { AssessmentSession } from "@/assessment-v2/types";

const storageKey = "nkoyo-adaptive-preview-v1";
const stageLabel = { opening: "Opening picture", probes: "A closer look", bridge: "How issues connect", finalists: "The final two", complete: "Your snapshot" };

function save(session: AssessmentSession) {
  try { window.localStorage.setItem(storageKey, JSON.stringify(session)); } catch { /* storage unavailable */ }
}

export function AdaptiveSnapshotPage() {
  const advanceOnServer = useServerFn(advanceAdaptiveAssessment);
  const checkpointOnServer = useServerFn(checkpointAdaptiveAssessment);
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    let loaded: AssessmentSession | null = null;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as AssessmentSession;
        if (parsed.version === "adaptive-v1" && Array.isArray(parsed.questions) && Array.isArray(parsed.answers)) loaded = parsed;
      }
    } catch { /* begin a fresh session */ }
    const current = loaded ?? createAssessmentSession();
    current.traceToken ??= crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    // Previous builds added events on every keystroke. Keep a bounded local history.
    current.events = current.events.slice(-128);
    setSession(current);
    save(current);
  }, []);

  useEffect(() => {
    if (!session || busy) return;
    const visibleQuestion = questionsForStage(session)[index]?.id;
    const timer = window.setTimeout(() => {
      void checkpointOnServer({ data: { session, action: "progress_saved", ...(visibleQuestion ? { questionId: visibleQuestion } : {}) } })
        .then(() => setSyncError(false)).catch(() => setSyncError(true));
    }, 800);
    return () => window.clearTimeout(timer);
  }, [session, index, busy, checkpointOnServer]);

  if (!session) return <div className="flex min-h-dvh items-center justify-center bg-blush"><Loader2 className="h-6 w-6 animate-spin text-magenta" aria-label="Loading" /></div>;

  const currentQuestions = questionsForStage(session);
  const question = currentQuestions[index] ?? currentQuestions[0];
  const answer = question ? session.answers.find((item) => item.questionId === question.id) : undefined;
  const selected = answer?.optionIds ?? [];
  const written = answer?.text ?? "";
  const needsOther = selected.includes("other");
  const canContinue = question?.kind === "text" ? written.trim().length > 0 : selected.length > 0 && (!needsOther || written.trim().length > 0);
  const answeredCount = session.answers.length;
  const progress = session.stage === "complete" ? 100 : Math.round((answeredCount / 11) * 100);
  const lastInStage = index >= currentQuestions.length - 1;
  const questionNumber = question ? session.questions.findIndex((item) => item.id === question.id) + 1 : 11;
  const latestModel = [...session.evaluations].reverse().find((item) => item.round === "final")?.model ?? session.evaluations.at(-1)?.model;
  const localRules = latestModel === "local-rules-demo";

  const updateAnswer = (optionIds: string[], text = written) => {
    if (!question) return;
    try {
      const next = submitAssessmentAnswer(session, { questionId: question.id, optionIds, text });
      // Keep the exact draft while typing: trimming a trailing space here joins
      // the next word to the previous one in the controlled textarea.
      next.answers = next.answers.map((item) => item.questionId === question.id ? { ...item, text } : item);
      // Drafts are synced; answer-submitted events are recorded when Next is pressed.
      next.events = session.events;
      setSession(next);
      save(next);
      setError("");
    } catch (cause) {
      // Permit an incomplete draft while it is being typed or deselected.
      if (!text.trim() || optionIds.length === 0) {
        const next = { ...session, updatedAt: new Date().toISOString(), answers: [...session.answers.filter((item) => item.questionId !== question.id), { questionId: question.id, optionIds, text, submittedAt: new Date().toISOString() }] };
        setSession(next);
        save(next);
        return;
      }
      setError(cause instanceof Error ? cause.message : "Please check this answer.");
    }
  };

  const goForward = async () => {
    if (!question || !canContinue || busy) return;
    setBusy(true);
    try {
      const confirmed = submitAssessmentAnswer(session, { questionId: question.id, optionIds: selected, text: written });
      setSession(confirmed);
      save(confirmed);
      if (!lastInStage) {
        await checkpointOnServer({ data: { session: confirmed, questionId: question.id, action: "answer_confirmed" } });
        setSyncError(false);
        setIndex(index + 1);
        setError("");
        return;
      }
      const next = await advanceOnServer({ data: confirmed });
      setSession(next);
      save(next);
      setIndex(0);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not continue. Please try again.");
    } finally { setBusy(false); }
  };

  const restart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await checkpointOnServer({ data: { session, action: "session_restarted" } });
      const fresh = createAssessmentSession();
      setSession(fresh);
      save(fresh);
      setIndex(0);
      setError("");
      setSyncError(false);
    } catch { setError("We could not save this assessment before restarting. Please try again."); }
    finally { setBusy(false); }
  };

  if (session.stage === "complete" && session.result) return <AdaptiveResultView session={session} onRestart={restart} restartError={error} restarting={busy} />;

  return <div className="flex min-h-dvh flex-col bg-blush">
    <header className="border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto grid max-w-4xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4">
        <Logo />
        <button type="button" onClick={restart} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"><RotateCcw className="h-4 w-4" /> Restart</button>
      </div>
    </header>
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <div className="mb-7 rounded-2xl border border-magenta/20 bg-card px-5 py-4 text-sm">
        <strong>Institutional Readiness Snapshot</strong> · {import.meta.env.DEV && latestModel ? localRules ? "Local rules demo: Jev is unavailable or not configured." : `Topic evaluation: ${latestModel}.` : "The first four questions build the opening picture."} {session.stage !== "complete" && "Progress saves on this device."}
      </div>
      {syncError && <p role="status" className="mb-5 text-sm text-muted-foreground">Your latest changes are saved on this device. Online saving failed; pressing Next will retry.</p>}
      {question ? <>
        <div className="mb-7"><div className="flex justify-between gap-3"><p className="eyebrow text-magenta">{stageLabel[session.stage]}</p><p className="text-sm font-semibold text-muted-foreground">Question {questionNumber} of up to 11</p></div><div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Assessment progress" className="mt-3 h-3 overflow-hidden rounded-full bg-blush-deep"><div className="h-full bg-lime" style={{ width: `${Math.max(progress, 3)}%` }} /></div></div>
        <section className="card-elevated p-7 sm:p-10">
          <h1 className="text-2xl font-black leading-snug sm:text-3xl">{question.text}</h1>
          {question.helper && <p className="mt-3 text-sm text-muted-foreground">{question.helper}</p>}
          {["q9", "q10", "q11"].includes(question.id) && <p role="status" className="mt-4 text-xs font-bold uppercase tracking-widest text-magenta">{question.source === "generated" ? `Generated by Gemini${question.model ? ` · ${question.model}` : ""}` : "Fixed follow-up question"}</p>}
          {question.kind === "text" ? <div className="mt-8"><label htmlFor={question.id} className="sr-only">Your answer</label><textarea id={question.id} value={written} onChange={(event) => updateAnswer([], event.target.value)} maxLength={1200} rows={6} placeholder="Write a few sentences..." className="w-full resize-y rounded-2xl border-2 border-border bg-card px-5 py-4 outline-none focus:border-magenta" /><p className="mt-2 text-right text-xs text-muted-foreground">{written.length}/1200</p></div> : <fieldset className="mt-8"><legend className="sr-only">Choose your answer</legend><div className="space-y-3">{question.options?.map((option) => {
            const checked = selected.includes(option.id);
            return <label key={option.id} className={`flex cursor-pointer gap-4 rounded-2xl border-2 px-5 py-4 ${checked ? "border-magenta bg-blush" : "border-border bg-card hover:border-magenta/50"}`}><input type={question.kind === "multiple" ? "checkbox" : "radio"} name={question.id} checked={checked} onChange={() => {
              if (question.kind === "single") updateAnswer([option.id], option.id === "other" ? written : "");
              else if (option.id === "none" || option.id === "unsure") updateAnswer([option.id], "");
              else {
                const next = checked ? selected.filter((id) => id !== option.id) : [...selected.filter((id) => id !== "none" && id !== "unsure"), option.id];
                if (next.length <= (question.maxSelections ?? 1)) updateAnswer(next, next.includes("other") ? written : "");
              }
            }} className="mt-1 h-5 w-5 shrink-0 accent-[oklch(0.65_0.266_335.4)]" /><span className="font-medium">{option.text}</span></label>;
          })}</div>{needsOther && <div className="mt-4"><label htmlFor="other-detail" className="block text-sm font-semibold">Tell us briefly what you mean</label><textarea id="other-detail" value={written} onChange={(event) => updateAnswer(selected, event.target.value)} maxLength={500} rows={3} className="mt-2 w-full rounded-2xl border-2 border-border bg-card px-5 py-4 outline-none focus:border-magenta" /></div>}</fieldset>}
        </section>
        {error && <p role="alert" className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
        <div className="mt-8 flex justify-between gap-4"><button type="button" onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0 || busy} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-6 py-3 font-semibold disabled:opacity-40"><ArrowLeft className="h-4 w-4" /> Back</button><button type="button" onClick={() => void goForward()} disabled={!canContinue || busy} className="inline-flex items-center gap-2 rounded-full bg-magenta px-7 py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Evaluating</> : <>{lastInStage ? "Continue" : "Next"}<ArrowRight className="h-4 w-4" /></>}</button></div>
        <p className="mt-8 text-center text-sm text-muted-foreground">Earlier stages are locked once you continue. Restart to change those answers. Assessment activity may be saved for private review by Nkoyo. <Link to="/privacy" className="underline">Privacy details</Link></p>
      </> : null}
    </main>
  </div>;
}
