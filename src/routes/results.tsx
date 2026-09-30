import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { Logo } from "@/components/brand/Logo";
import { BookingButton } from "@/components/brand/BookingButton";
import { LeadForm } from "@/components/snapshot/LeadForm";
import { bookingCopy } from "@/config/brand";
import { deepDiveQuestions, dimensions, questions } from "@/config/questions";
import { resultsDisclaimer } from "@/config/results";
import { buildResult } from "@/lib/snapshot-engine";
import { loadDraft, type SnapshotDraft } from "@/lib/snapshot-storage";

export const Route = createFileRoute("/results")({
  head: () => ({
    meta: [
      { title: "Your Snapshot Results | Institutional Readiness Snapshot" },
      {
        name: "description",
        content:
          "Qualitative patterns across Culture, Capacity and Compliance based on your answers, with practical next steps.",
      },
      { property: "og:title", content: "Your Institutional Readiness Snapshot results" },
      {
        property: "og:description",
        content: "Patterns and practical next steps based on your answers.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResultsPage,
});

function ResultsPage() {
  const [draft, setDraft] = useState<SnapshotDraft | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDraft(loadDraft());
    setReady(true);
  }, []);

  const complete = draft ? Boolean(draft.completedAt) && questions.every((q) => draft.answers[q.id]) && deepDiveQuestions.every((q) => draft.deepDiveAnswers[q.id]?.trim()) : false;
  const result = useMemo(() => (complete && draft ? buildResult(draft.answers, draft.deepDiveAnswers, draft.focusDimension) : null), [complete, draft]);

  if (!ready) {
    return <div className="min-h-dvh bg-blush" aria-busy="true" />;
  }

  if (!result || !draft) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-blush px-5 text-center">
        <h1 className="text-3xl font-black">No results yet</h1>
        <p className="max-w-md text-muted-foreground">
          We couldn't find a completed Snapshot on this device. The reflection takes about ten
          minutes.
        </p>
        <Link
          to="/snapshot"
          className="inline-flex min-h-12 items-center rounded-full bg-magenta px-8 font-bold text-primary-foreground"
        >
          Start the Snapshot
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-blush">
      <header className="no-print border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center">
            <Logo />
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            <Printer className="h-4 w-4" aria-hidden="true" /> Print / save as PDF
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12">
        <p className="eyebrow text-magenta">Your Snapshot</p>
        <h1 className="mt-4 max-w-3xl text-balance-tight text-3xl font-black leading-tight sm:text-5xl">
          {result.headline}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{result.summary}</p>
        <p className="mt-4 max-w-2xl rounded-2xl bg-card p-4 text-sm text-muted-foreground print-plain">
          {resultsDisclaimer}
        </p>

        <section className="mt-8 rounded-3xl border-2 border-magenta/20 bg-card p-7 print-plain">
          <p className="eyebrow text-magenta">Your chosen focus</p>
          <h2 className="mt-2 text-2xl font-black">
            {dimensions.find((d) => d.id === result.focusDimension)?.name}: {result.focusTopic}
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            You explored this area after the nine screening questions. The notes below are your own words and have not been independently verified.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {result.writtenContext.map((entry) => (
              <div key={entry.id} className="rounded-2xl bg-blush p-5">
                <h3 className="text-sm font-bold">{entry.label}</h3>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{entry.answer}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pattern cards */}
        <section className="mt-12">
          <h2 className="text-2xl font-black">What your answers suggest</h2>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {result.cards.map((card) => {
              const dimension = dimensions.find((d) => d.id === card.dimension)!;
              return (
                <article key={card.dimension} className="card-elevated p-7 print-plain">
                  <p className="eyebrow text-magenta">{dimension.name}</p>
                  <h3 className="mt-3 text-xl font-extrabold leading-snug">{card.headline}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    {card.suggests}
                  </p>
                  <div className="mt-5 rounded-2xl bg-blush p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-navy/60">
                      Worth exploring
                    </p>
                    <p className="mt-1 text-sm font-medium">{card.explore}</p>
                  </div>
                  <div className="mt-4 rounded-2xl border-l-4 border-lime bg-card p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-navy/60">
                      One realistic action
                    </p>
                    <p className="mt-1 text-sm font-medium">{card.action}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Next conversation */}
        <section className="mt-12 rounded-3xl bg-navy p-8 text-navy-foreground print-plain sm:p-10">
          <h2 className="text-2xl font-black">Your next conversation</h2>
          <p className="mt-2 opacity-85">
            Three prompts to take to your leadership team or board.
          </p>
          <ol className="mt-6 space-y-4">
            {result.conversationPrompts.map((prompt, index) => (
              <li key={prompt} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime font-display text-sm font-black text-lime-foreground">
                  {index + 1}
                </span>
                <span className="pt-1 font-medium">{prompt}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Starting action */}
        <section className="mt-8 rounded-3xl border-2 border-lime bg-card p-8 print-plain">
          <p className="eyebrow text-magenta">Start here this week</p>
          <p className="mt-3 text-xl font-bold leading-snug">{result.startingAction}</p>
          <p className="mt-3 text-sm text-muted-foreground">Use the situation and outcome you described above to make this step specific to your organization.</p>
        </section>

        {/* Booking */}
        <section className="no-print mt-12 card-elevated p-8 sm:p-10">
          <h2 className="text-2xl font-black">{bookingCopy.cta}</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">{bookingCopy.supporting}</p>
          <div className="mt-6">
            <BookingButton sessionKey={draft.sessionKey} />
          </div>
        </section>

        {/* Lead capture */}
        <section className="no-print mt-8">
          <LeadForm sessionKey={draft.sessionKey} />
        </section>

        <div className="no-print mt-10 flex flex-wrap gap-4 text-sm">
          <Link to="/snapshot" className="underline underline-offset-4 hover:text-magenta">
            Review or change my answers
          </Link>
          <Link to="/" className="underline underline-offset-4 hover:text-magenta">
            Back to home
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
