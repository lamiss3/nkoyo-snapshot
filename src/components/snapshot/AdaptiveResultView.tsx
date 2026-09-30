import { Link } from "@tanstack/react-router";
import { Printer, RotateCcw } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { BookingButton } from "@/components/brand/BookingButton";
import { AdaptiveEmailCapture } from "@/components/snapshot/AdaptiveEmailCapture";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { bookingCopy } from "@/config/brand";
import { buildAdaptivePresentation } from "@/assessment-v2/result-content";
import { problemById } from "@/assessment-v2/problem-bank";
import type { AssessmentSession, DimensionId } from "@/assessment-v2/types";

const dimensions: { id: DimensionId; name: string; prompt: string }[] = [
  { id: "culture", name: "Culture", prompt: "How do decisions, responsibilities, and working relationships play out day to day?" },
  { id: "capacity", name: "Capacity", prompt: "Can people, funding, and systems reliably carry current commitments?" },
  { id: "compliance", name: "Compliance", prompt: "Are responsibilities, safeguards, and requirements clear in practice?" },
];

export function AdaptiveResultView({ session, onRestart }: { session: AssessmentSession; onRestart: () => void }) {
  const result = session.result;
  if (!result) return null;
  const presentation = buildAdaptivePresentation(session);
  const finalModel = [...session.evaluations].reverse().find((record) => record.round === "final")?.model ?? session.evaluations.at(-1)?.model;
  const localRules = finalModel === "local-rules-demo";

  return <div className="min-h-dvh bg-blush">
    <header className="no-print border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
        <Logo />
        <button type="button" onClick={() => window.print()} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary"><Printer className="h-4 w-4" aria-hidden="true" /> Print / save as PDF</button>
      </div>
    </header>

    <main className="mx-auto max-w-5xl px-5 py-12">
      <p className="eyebrow text-magenta">Your institutional readiness snapshot</p>
      <h1 className="mt-4 max-w-4xl text-balance-tight text-3xl font-black leading-tight sm:text-5xl">{presentation.headline}</h1>
      <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{presentation.summary}</p>
      <p className="mt-5 max-w-3xl rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground print-plain">
        {localRules ? "This localhost preview used fixed routing rules. Written answers were matched for a few topic words, not interpreted by AI." : "Jev interpreted your answers to identify possible topics. Gemini wrote deeper questions when available."} This is a starting point for discussion, not a verified audit, legal review, or organizational diagnosis.
      </p>
      {import.meta.env.DEV && <p className="no-print mt-3 text-xs text-muted-foreground">Assessment mode: {localRules ? "local rules demo" : finalModel ?? "unknown"}</p>}

      {presentation.insights.length > 0 && <section className="mt-10 rounded-3xl border-2 border-magenta/20 bg-card p-7 print-plain sm:p-9">
        <p className="eyebrow text-magenta">Your starting focus</p>
        <h2 className="mt-2 text-2xl font-black">{presentation.insights[0]!.title}</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">{presentation.insights[0]!.meaning}</p>
        {presentation.insights.length > 1 && <p className="mt-4 rounded-2xl bg-blush p-4 text-sm"><strong>Related pressure to examine:</strong> {presentation.insights[1]!.title}. The two may be connected, but your team should check that with concrete examples.</p>}
      </section>}

      {presentation.context.length > 0 && <section className="mt-12">
        <h2 className="text-2xl font-black">The situations you described</h2>
        <p className="mt-2 text-sm text-muted-foreground">These are your words. They have not been independently verified.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">{presentation.context.map((entry) => <article key={entry.id} className="rounded-2xl bg-card p-6 shadow-card print-plain"><h3 className="text-sm font-bold text-magenta">{entry.label}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{entry.answer}</p></article>)}</div>
      </section>}

      {presentation.insights.length > 0 && <section className="mt-12">
        <h2 className="text-2xl font-black">What your answers suggest</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">The topics below came from the final assessment round. Use them as questions to test with your team.</p>
        <div className="mt-6 grid gap-6 md:grid-cols-2">{presentation.insights.map((item) => <article key={item.id} className="card-elevated p-7 print-plain">
          <p className="eyebrow text-magenta">{item.label} · {item.dimension}</p>
          <h3 className="mt-3 text-xl font-extrabold">{item.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.meaning}</p>
          <div className="mt-5 rounded-2xl bg-blush p-4"><p className="text-xs font-bold uppercase tracking-widest text-navy/60">Your fixed-probe answer</p><p className="mt-2 text-sm font-medium">{item.evidence}</p></div>
          <div className="mt-4 rounded-2xl border-l-4 border-lime bg-card p-4"><p className="text-xs font-bold uppercase tracking-widest text-navy/60">Worth exploring</p><p className="mt-2 text-sm font-medium">{item.explore}</p></div>
        </article>)}</div>
      </section>}

      {presentation.strongestDimension && <section className="mt-12">
        <h2 className="text-2xl font-black">Culture, Capacity and Compliance</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">This is the relative distribution of topics flagged across the full 20-topic screen. It is not a grade or the likelihood of a problem.</p>
        <div className="mt-6 grid gap-5 md:grid-cols-3">{dimensions.map((dimension) => {
          const share = result.threeCShare[dimension.id];
          const finalist = presentation.insights.find((item) => problemById[item.id].primaryDimension === dimension.id);
          return <article key={dimension.id} className="card-elevated p-6 print-plain">
            <div className="flex items-baseline justify-between gap-3"><h3 className="text-xl font-extrabold">{dimension.name}</h3><span className="text-sm font-bold text-magenta">{share}%</span></div>
            <div aria-hidden="true" className="mt-4 h-2 overflow-hidden rounded-full bg-blush-deep"><div className="h-full rounded-full bg-lime" style={{ width: `${share}%` }} /></div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{finalist ? `${finalist.title} was one of your finalist topics.` : dimension.prompt}</p>
          </article>;
        })}</div>
      </section>}

      <section className="mt-12 rounded-3xl bg-navy p-8 text-navy-foreground print-plain sm:p-10">
        <h2 className="text-2xl font-black">Your next conversation</h2>
        <p className="mt-2 opacity-85">Three prompts to take to your team or board.</p>
        <ol className="mt-6 space-y-4">{presentation.prompts.map((prompt, index) => <li key={prompt} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime font-display text-sm font-black text-lime-foreground">{index + 1}</span><span className="pt-1 font-medium">{prompt}</span></li>)}</ol>
      </section>

      <section className="mt-8 rounded-3xl border-2 border-lime bg-card p-8 print-plain">
        <p className="eyebrow text-magenta">Start here this week</p>
        <p className="mt-3 text-xl font-bold leading-snug">{presentation.startingAction}</p>
        <p className="mt-3 text-sm text-muted-foreground">Use one of your examples above to make this step specific to your organization.</p>
      </section>

      <section className="no-print mt-12 card-elevated p-8 sm:p-10">
        <h2 className="text-2xl font-black">{bookingCopy.cta}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{bookingCopy.supporting}</p>
        <div className="mt-6"><BookingButton sessionKey={session.id} label="Explore this with Nkoyo" /></div>
      </section>

      <AdaptiveEmailCapture session={session} />

      <div className="no-print mt-10 flex flex-wrap items-center gap-5 text-sm">
        <button type="button" onClick={onRestart} className="inline-flex items-center gap-2 font-semibold underline underline-offset-4 hover:text-magenta"><RotateCcw className="h-4 w-4" /> Start a new snapshot</button>
        <Link to="/" className="font-semibold underline underline-offset-4 hover:text-magenta">Back to home</Link>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
