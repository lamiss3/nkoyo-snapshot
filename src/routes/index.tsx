import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Compass, Layers, Sparkles } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { BookingButton } from "@/components/brand/BookingButton";
import { brand, bookingCopy } from "@/config/brand";
import { dimensions } from "@/config/questions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Institutional Readiness Snapshot | Iban Ison Solutions" },
      {
        name: "description",
        content: "Explore Culture, Capacity and Compliance through an adaptive assessment with practical next steps.",
      },
      { property: "og:title", content: "Institutional Readiness Snapshot" },
      {
        property: "og:description",
        content:
          "Take a closer look at the systems behind your mission and identify where to focus next.",
      },
    ],
  }),
  component: LandingPage,
});

const benefits = [
  {
    icon: Compass,
    title: "See the patterns",
    body: "Recognize where decisions, responsibilities and systems create friction.",
  },
  {
    icon: Layers,
    title: "Find a starting point",
    body: "Leave with practical questions and actions for your team or board.",
  },
  {
    icon: Sparkles,
    title: "Design what's next",
    body: "Explore where deeper institutional support may help.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-navy text-navy-foreground">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-magenta/40 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-lime/20 blur-3xl"
          />
          <div className="relative mx-auto max-w-6xl px-5 py-20 sm:py-28">
            <p className="eyebrow text-lime">Institutional Readiness Snapshot</p>
            <h1 className="mt-6 max-w-4xl text-balance-tight text-4xl font-black leading-[1.05] sm:text-6xl lg:text-7xl">
              What's making leadership{" "}
              <span className="text-lime">harder than it needs to be?</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed opacity-90 sm:text-xl">
              Take a closer look at the systems behind your mission. This short reflection helps you
              explore your organization's Culture, Capacity, and Compliance—and identify where to
              focus next.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link
                to="/snapshot"
                className="inline-flex min-h-14 items-center gap-2 rounded-full bg-magenta px-9 text-lg font-bold text-primary-foreground shadow-lift transition-transform hover:-translate-y-0.5 hover:bg-magenta/90"
              >
                Start the Snapshot <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <p className="text-sm font-medium opacity-80">Up to 11 adaptive questions · Practical next steps</p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
          <h2 className="max-w-2xl text-3xl font-black sm:text-4xl">
            A reflection, not a test. No scores, no grades.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Start with four opening questions, explore the topics your answers raise, then look more closely at the two strongest possibilities.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {benefits.map(({ icon: Icon, title, body }) => (
              <article key={title} className="card-elevated p-8">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-lime text-lime-foreground">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <h3 className="mt-6 text-xl font-extrabold">{title}</h3>
                <p className="mt-3 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Dimensions */}
        <section className="surface-blush">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <p className="eyebrow text-magenta">Three connected dimensions</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-black sm:text-4xl">
              Culture, Capacity and Compliance move together.
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {dimensions.map((dimension, index) => (
                <article
                  key={dimension.id}
                  className="group relative overflow-hidden rounded-3xl bg-navy p-8 text-navy-foreground shadow-card transition-transform hover:-translate-y-1"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -right-6 -top-8 font-display text-8xl font-black text-white/5"
                  >
                    0{index + 1}
                  </span>
                  <h3 className="text-2xl font-black text-lime">{dimension.name}</h3>
                  <p className="mt-3 font-semibold">{dimension.blurb}</p>
                  <p className="mt-4 text-sm leading-relaxed opacity-80">{dimension.detail}</p>
                </article>
              ))}
            </div>
            <p className="mt-10 rounded-full bg-card px-6 py-4 text-center font-semibold shadow-card sm:inline-block">
              Up to 11 adaptive questions · Practical next steps
            </p>
          </div>
        </section>

        {/* About */}
        <section id="about" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="mx-auto w-full max-w-sm">
              {brand.portrait.imageUrl ? (
                <img
                  src={brand.portrait.imageUrl}
                  alt={brand.portrait.alt}
                  className="aspect-[4/5] w-full rounded-3xl object-cover shadow-lift"
                />
              ) : (
                <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-magenta/40 bg-blush text-center">
                  <span className="flex h-24 w-24 items-center justify-center rounded-full bg-magenta font-display text-2xl font-black text-primary-foreground">
                    {brand.portrait.initials}
                  </span>
                  <p className="px-6 text-sm text-muted-foreground">
                    Portrait placeholder — add a photo of Nkoyo in the site configuration.
                  </p>
                </div>
              )}
            </div>
            <div>
              <p className="eyebrow text-magenta">About</p>
              <h2 className="mt-4 text-3xl font-black sm:text-4xl">{brand.personName}</h2>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Nkoyo Effiong Lewis is the founder of Iban Ison Solutions. She has a background in
                nonprofit law, governance and organizational strategy, and works with mission-driven
                leaders to strengthen culture, capacity and compliance.
              </p>
              <div className="mt-8">
                <BookingButton />
                <p className="mt-3 max-w-lg text-sm text-muted-foreground">
                  {bookingCopy.supporting}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="bg-navy-deep text-navy-foreground">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center">
            <h2 className="text-3xl font-black sm:text-5xl">
              Ready to look at the systems behind the work?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg opacity-85">
              Up to eleven questions. Explore possible priorities across Culture, Capacity and Compliance.
            </p>
            <Link
              to="/snapshot"
              className="mt-10 inline-flex min-h-14 items-center gap-2 rounded-full bg-lime px-9 text-lg font-bold text-lime-foreground transition-transform hover:-translate-y-0.5"
            >
              Start the Snapshot <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
