import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Clock3, Mail } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/report-requested")({
  validateSearch: (search: Record<string, unknown>): { delivery?: "automatic" | "review" } => {
    const delivery = search["delivery"];
    return delivery === "automatic" || delivery === "review" ? { delivery } : {};
  },
  head: () => ({
    meta: [
      { title: "Thank you | Your personalized Snapshot report" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportRequestedPage,
});

function ReportRequestedPage() {
  const { delivery } = Route.useSearch();
  const confirmed = Boolean(delivery);
  return (
    <div className="min-h-dvh bg-blush">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <Logo />
          <span className="text-sm font-semibold text-muted-foreground">Your Snapshot</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-20">
        <section className="card-elevated overflow-hidden p-7 sm:p-12">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-lime text-navy">
            {confirmed ? (
              <Check className="h-7 w-7" aria-hidden="true" />
            ) : (
              <Mail className="h-7 w-7" aria-hidden="true" />
            )}
          </div>
          <p className="eyebrow mt-7 text-magenta">Created around your answers</p>
          <h1 className="mt-3 text-balance-tight text-3xl font-black leading-tight sm:text-5xl">
            {confirmed
              ? "Thank you. Your report request is in."
              : "A deeper look at your Snapshot."}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            {delivery === "automatic"
              ? "We’re preparing your personalized assessment report. It brings together the answers you shared, the patterns highlighted in your Snapshot, and practical next steps tailored to those findings."
              : delivery === "review"
                ? "Your request has been saved for preparation and review. Your detailed report will be built around your answers and the patterns highlighted in your Snapshot."
                : "Complete your Snapshot and request a detailed report to receive insights and practical next steps tailored to your answers."}
          </p>
          {delivery === "automatic" && (
            <div className="mt-8 rounded-2xl border border-magenta/20 bg-blush p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <Clock3 className="h-5 w-5 shrink-0 text-magenta" aria-hidden="true" />
                <h2 className="text-lg font-extrabold">Your personalized report is on its way</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Expect it in your inbox in about five minutes. We’re bringing your answers together
                into a custom report with more detail and practical next steps than your on-screen
                results. Some reports may take a little longer.
              </p>
            </div>
          )}
          {confirmed && (
            <p className="mt-7 text-sm leading-relaxed text-muted-foreground">
              We’ll send your report to the email address you provided. Check your inbox and your
              Spam or Promotions folder. You can close this page; there’s no need to submit again.
            </p>
          )}
          <Link
            to="/snapshot"
            className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-navy px-6 font-bold text-navy-foreground hover:bg-navy/90"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {confirmed ? "Back to my Snapshot" : "Take the Snapshot"}
          </Link>
        </section>
      </main>
      <footer className="border-t border-border/60 px-5 py-7 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-4">
          <p>{brand.orgName}</p>
          <Link to="/privacy" className="underline underline-offset-4">
            Privacy information
          </Link>
        </div>
      </footer>
    </div>
  );
}
