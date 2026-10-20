import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { legal } from "@/config/legal";

export interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="break-words font-semibold text-navy underline decoration-magenta/50 underline-offset-4 hover:decoration-navy"
    >
      {children}
    </a>
  );
}

export function LegalPage({
  title,
  description,
  summary,
  sections,
}: {
  title: string;
  description: ReactNode;
  summary: string[];
  sections: LegalSection[];
}) {
  return (
    <div className="landing-page min-h-dvh bg-background">
      <a href="#legal-content" className="landing-skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="legal-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
        <div className="max-w-3xl">
          <p className="eyebrow text-navy/70">Institutional Readiness Snapshot</p>
          <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            Last updated <time dateTime={legal.updatedDate}>{legal.updatedLabel}</time> ·{" "}
            {legal.operatorName}
          </p>
          <div className="mt-6 text-lg leading-relaxed text-muted-foreground">{description}</div>
        </div>
        <section
          aria-labelledby="legal-summary-heading"
          className="mt-8 max-w-3xl rounded-3xl border border-border bg-blush p-6 sm:p-8"
        >
          <h2 id="legal-summary-heading" className="text-lg font-extrabold">
            At a glance
          </h2>
          <ul className="mt-4 list-disc space-y-3 pl-5 leading-relaxed text-muted-foreground">
            {summary.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
          <nav
            aria-label="On this page"
            className="rounded-3xl border border-border bg-card p-5 lg:sticky lg:top-28"
          >
            <h2 className="px-2 text-sm font-extrabold">On this page</h2>
            <ol className="mt-3 grid sm:grid-cols-2 lg:grid-cols-1">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex min-h-11 w-full items-center rounded-xl px-2 py-2 text-sm font-semibold leading-relaxed text-muted-foreground hover:bg-blush hover:text-navy"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="min-w-0 max-w-3xl space-y-9 pb-6">
            {sections.map((section) => (
              <section
                id={section.id}
                key={section.id}
                aria-labelledby={`${section.id}-heading`}
                className="landing-anchor"
              >
                <h2 id={`${section.id}-heading`} className="text-2xl font-extrabold leading-snug">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 leading-relaxed text-muted-foreground">
                  {section.content}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
