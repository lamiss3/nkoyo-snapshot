import type { ReactNode } from "react";
import { ArrowRight, Compass, Layers, Mail } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { homeDefaults, text, links, flag, type Content } from "./content";

const benefits = [
  {
    icon: Compass,
    label: "Your focus",
    title: "See possible priorities",
    body: "See which pressures your answers suggest are worth a closer look, across Culture, Capacity and Compliance.",
  },
  {
    icon: Layers,
    label: "Your next conversation",
    title: "Bring a useful starting point",
    body: "Take discussion prompts and a practical first step to your team or board, grounded in what you shared.",
  },
  {
    icon: Mail,
    label: "Your optional report",
    title: "Explore your answers further",
    body: "Request a personalized email report that explains your findings in more detail, with examples and useful next steps.",
  },
];

// Landing copy only: assessment definitions and stored question copy stay unchanged.
const landingDimensions = [
  {
    name: "Culture",
    blurb: "How decisions and responsibilities work.",
    detail:
      "Decision authority, board–staff boundaries, shared priorities and how stated values guide everyday choices.",
  },
  {
    name: "Capacity",
    blurb: "How people and resources carry the work.",
    detail:
      "Workload, funding, continuity and access to the knowledge and tools needed to deliver current commitments.",
  },
  {
    name: "Compliance",
    blurb: "How responsibilities and safeguards work in practice.",
    detail:
      "Ownership of requirements, reporting, partnership rules and the checks that support responsible decisions.",
  },
];

function StartSnapshot({ className = "", content }: { className?: string; content: Content }) {
  return (
    <a href={text(content, "ctaHref")} className={`snapshot-cta ${className}`}>
      {text(content, "ctaLabel")} <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
    </a>
  );
}

export function HomepageView({
  content = homeDefaults,
  children,
}: {
  content?: Content;
  children?: ReactNode;
}) {
  const c = { ...homeDefaults, ...content };
  const t = (key: string) => text(c, key);
  const benefitsCopy = benefits.map((b, n) => ({
    ...b,
    label: t(`benefit${n}Label`),
    title: t(`benefit${n}Title`),
    body: t(`benefit${n}Body`),
  }));
  const dimensionsCopy = landingDimensions.map((d, n) => ({
    ...d,
    blurb: t(`dimension${n}Blurb`),
    detail: t(`dimension${n}Detail`),
  }));
  return (
    <div className="landing-page min-h-dvh bg-background">
      <a href="#main-content" className="landing-skip-link">
        Skip to content
      </a>
      <SiteHeader
        navItems={links(c, "navigationLinks")}
        cta={{ label: t("ctaLabel"), href: t("ctaHref") }}
      />
      <main id="main-content" tabIndex={-1}>
        <section
          aria-labelledby="snapshot-heading"
          className="relative overflow-hidden bg-navy text-navy-foreground"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-magenta/30 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-lime/15 blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-5 py-12 text-center sm:py-16 lg:py-20">
            <p className="eyebrow text-lime">{t("heroEyebrow")}</p>
            <p className="mt-3 text-sm font-semibold text-navy-foreground/85 sm:text-base">
              {t("audience")}
            </p>
            <h1
              id="snapshot-heading"
              className="mx-auto mt-5 max-w-4xl text-balance-tight text-[clamp(2.25rem,10vw,2.5rem)] font-black leading-[1.08] sm:text-6xl lg:text-7xl"
            >
              {t("heroTitle")} <span className="text-lime">{t("heroHighlight")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-foreground/90 sm:text-xl">
              {t("heroDescription")}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4">
              <StartSnapshot content={c} />
              {t("secondaryHref") && (
                <a className="landing-secondary-link text-white" href={t("secondaryHref")}>
                  {t("secondaryLabel")}
                </a>
              )}
              <p className="max-w-xs text-sm leading-relaxed text-navy-foreground/85">
                {t("heroNote")
                  .split("\n")
                  .map((line, n) => (
                    <span key={n} className="block">
                      {line}
                    </span>
                  ))}
              </p>
            </div>
          </div>
        </section>

        {flag(c, "howVisible") && (
          <section
            id="how-it-works"
            aria-labelledby="how-heading"
            className="landing-anchor mx-auto max-w-6xl px-5 py-14 sm:py-20"
          >
            <p className="eyebrow text-navy/70">How it works</p>
            <h2 id="how-heading" className="mt-4 max-w-2xl text-3xl font-black sm:text-4xl">
              {t("howTitle")}
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              {t("howBody")}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">{t("howNote")}</p>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {benefitsCopy.map(({ icon: Icon, label, title, body }) => (
                <article key={title} className="card-elevated p-6 sm:p-8">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-lime text-lime-foreground">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <p className="mt-6 text-xs font-bold uppercase tracking-widest text-navy/70">
                    {label}
                  </p>
                  <h3 className="mt-2 text-xl font-extrabold leading-snug">{title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
            <div className="mt-7 rounded-3xl border border-border bg-blush p-6 sm:flex sm:items-start sm:gap-5 sm:p-7">
              <Mail
                className="mb-3 h-6 w-6 shrink-0 text-navy sm:mb-0 sm:mt-1"
                aria-hidden="true"
              />
              <div>
                <h3 className="font-extrabold">{t("emailTitle")}</h3>
                <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">
                  {t("emailBody")}
                </p>
              </div>
            </div>
          </section>
        )}

        {flag(c, "dimensionsVisible") && (
          <section aria-labelledby="dimensions-heading" className="surface-blush">
            <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
              <p className="eyebrow text-navy/70">Three connected dimensions</p>
              <h2
                id="dimensions-heading"
                className="mt-4 max-w-3xl text-3xl font-black sm:text-4xl"
              >
                {t("dimensionsTitle")}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {t("dimensionsBody")}
              </p>
              <div className="mt-9 grid gap-5 md:grid-cols-3">
                {dimensionsCopy.map((dimension, index) => (
                  <article
                    key={dimension.name}
                    className="relative overflow-hidden rounded-3xl bg-navy p-6 text-navy-foreground shadow-card sm:p-8"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute -right-6 -top-8 font-display text-8xl font-black text-white/5"
                    >
                      0{index + 1}
                    </span>
                    <h3 className="relative text-2xl font-black text-lime">{dimension.name}</h3>
                    <p className="relative mt-4 font-bold leading-relaxed">{dimension.blurb}</p>
                    <p className="relative mt-4 text-sm leading-relaxed text-navy-foreground/85">
                      {dimension.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {flag(c, "aboutVisible") && (
          <section
            id="about"
            aria-labelledby="about-heading"
            className="landing-anchor mx-auto max-w-6xl px-5 py-14 sm:py-20"
          >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center lg:gap-16">
              {t("portraitUrl") ? (
                <img
                  src={t("portraitUrl")}
                  alt={t("portraitAlt")}
                  width={480}
                  height={600}
                  loading="lazy"
                  className="mx-auto aspect-[4/5] w-full max-w-sm rounded-3xl object-cover shadow-card"
                />
              ) : (
                <div className="rounded-3xl bg-navy p-8 text-navy-foreground sm:p-10">
                  <p className="eyebrow text-navy-foreground/80">Iban Ison Solutions</p>
                  <p className="mt-8 max-w-xs text-4xl font-black leading-tight sm:text-5xl">
                    Design <span className="text-lime">what’s next.</span>
                  </p>
                  <div aria-hidden="true" className="mt-8 h-1 w-16 rounded-full bg-magenta" />
                  <p className="mt-6 text-sm font-semibold text-navy-foreground/85">
                    Culture. Capacity. Compliance.
                  </p>
                </div>
              )}
              <div>
                <p className="eyebrow text-navy/70">About the founder</p>
                <h2 id="about-heading" className="mt-4 text-3xl font-black sm:text-4xl">
                  {t("aboutTitle")}
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                  {t("aboutBody")}
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <StartSnapshot content={c} />
                  {t("bookingHref") && (
                    <a
                      href={t("bookingHref")}
                      target="_blank"
                      rel="noreferrer"
                      className="landing-secondary-link"
                    >
                      {t("bookingLabel")}
                      <span className="sr-only"> (opens in a new tab)</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                </div>
                {t("bookingHref") && (
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                    {t("bookingBody")}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {flag(c, "closingVisible") && (
          <section aria-labelledby="closing-heading" className="bg-navy-deep text-navy-foreground">
            <div className="mx-auto max-w-4xl px-5 py-14 text-center sm:py-20">
              <h2
                id="closing-heading"
                className="text-balance-tight text-3xl font-black sm:text-5xl"
              >
                {t("closingTitle")}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-navy-foreground/85">
                {t("closingBody")}
              </p>
              <StartSnapshot content={c} className="mt-8" />
            </div>
          </section>
        )}
        {children}
      </main>
      <SiteFooter footerLinks={links(c, "footerLinks")} contactEmail={t("contactEmail")} />
    </div>
  );
}
