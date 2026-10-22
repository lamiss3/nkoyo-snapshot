import { useState, type ReactNode } from "react";
import { ArrowRight, Compass, Layers, MessageCircle, Quote } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { homeDefaults, text, links, flag, type Content } from "./content";

function SnapshotLink({ content, className = "" }: { content: Content; className?: string }) {
  return (
    <a href={text(content, "ctaHref")} className={`snapshot-cta ${className}`}>
      {text(content, "ctaLabel")}
      <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
    </a>
  );
}
function ConversationLink({
  content,
  dark = false,
  className = "",
}: {
  content: Content;
  dark?: boolean;
  className?: string;
}) {
  const href = text(content, "bookingHref");
  if (!href) return null;
  return (
    <a
      href={href}
      className={`conversation-cta ${dark ? "conversation-cta-on-dark" : ""} ${className}`}
    >
      {text(content, "bookingLabel")}
      <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
    </a>
  );
}
function Portrait({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return url && !failed ? (
    <img
      src={url}
      alt={alt}
      width={480}
      height={600}
      loading="lazy"
      onError={() => setFailed(true)}
      className="mx-auto aspect-[4/5] w-full max-w-sm rounded-3xl object-cover shadow-card"
    />
  ) : (
    <div className="rounded-3xl bg-navy p-8 text-navy-foreground sm:p-10">
      <p className="eyebrow text-lime">Iban Ison Solutions</p>
      <p className="mt-8 text-4xl font-black leading-tight sm:text-5xl">
        Design <span className="text-lime">what’s next.</span>
      </p>
      <div aria-hidden="true" className="mt-8 h-1 w-16 rounded-full bg-magenta" />
      <p className="mt-6 font-semibold">Culture. Capacity. Compliance.</p>
    </div>
  );
}

export function HomepageView({
  content = homeDefaults,
  children,
  hasInsights = false,
}: {
  content?: Content;
  children?: ReactNode;
  hasInsights?: boolean;
}) {
  const c = { ...homeDefaults, ...content };
  const t = (key: string) => text(c, key);
  const heroConversation = {
    ...c,
    bookingHref: t("secondaryHref") || t("bookingHref"),
    bookingLabel: t("secondaryLabel") || t("bookingLabel"),
  };
  const stages = [Compass, Layers, ArrowRight];
  const dimensions = ["Culture", "Capacity", "Compliance"];
  const navigation = links(c, "navigationLinks").map((item) =>
    item.label === "Insights & Resources" && item.href === "/resources" && hasInsights
      ? { ...item, href: "/#insights-resources" }
      : item,
  );
  const testimonials = [0, 1].filter(
    (n) => t(`testimonial${n}Quote`) && t(`testimonial${n}Attribution`),
  );
  return (
    <div className="landing-page min-h-dvh bg-background">
      <a href="#main-content" className="landing-skip-link">
        Skip to content
      </a>
      <SiteHeader
        navItems={navigation}
        cta={
          t("bookingHref")
            ? { label: t("bookingLabel"), href: t("bookingHref") }
            : { label: t("ctaLabel"), href: t("ctaHref") }
        }
      />
      <main id="main-content" tabIndex={-1}>
        <section
          aria-labelledby="home-heading"
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
          <div className="relative mx-auto max-w-6xl px-5 py-12 text-center sm:py-14 lg:py-16">
            <p className="eyebrow text-lime">{t("heroEyebrow")}</p>
            <p className="mt-4 text-sm font-semibold text-navy-foreground/85 sm:text-base">
              {t("audience")}
            </p>
            <h1
              id="home-heading"
              className="mx-auto mt-6 max-w-5xl text-balance-tight text-[clamp(2.25rem,6vw,4rem)] font-black leading-[1.08]"
            >
              {t("heroTitle")} <span className="sm:block text-lime">{t("heroHighlight")}</span>
            </h1>
            <p className="mx-auto mt-7 max-w-3xl whitespace-pre-line text-lg leading-relaxed text-navy-foreground/90 sm:text-xl">
              {t("heroDescription")}
            </p>
            <div className="home-actions mx-auto mt-8 max-w-2xl">
              <SnapshotLink content={c} />
              <ConversationLink content={heroConversation} dark />
            </div>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-navy-foreground/80">
              {t("heroNote")}
            </p>
          </div>
        </section>

        <section
          id="approach"
          aria-labelledby="approach-heading"
          className="landing-anchor surface-blush"
        >
          <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-16">
              <div>
                <p className="eyebrow text-navy/70">Our approach</p>
                <h2
                  id="approach-heading"
                  className="mt-4 text-3xl font-black leading-tight sm:text-4xl"
                >
                  {t("approachTitle")}
                </h2>
              </div>
              <div>
                <p className="text-lg leading-relaxed text-muted-foreground">{t("approachBody")}</p>
                <p className="mt-4 font-semibold leading-relaxed">{t("approachNote")}</p>
              </div>
            </div>
            {flag(c, "dimensionsVisible") && (
              <div className="mt-12 border-t border-navy/15 pt-9">
                <h3 className="text-2xl font-black sm:text-3xl">{t("dimensionsTitle")}</h3>
                <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
                  {t("dimensionsBody")}
                </p>
                <div className="mt-8 grid gap-5 md:grid-cols-3">
                  {dimensions.map((name, n) => (
                    <article
                      key={name}
                      className="relative overflow-hidden rounded-3xl bg-navy p-6 text-navy-foreground shadow-card sm:p-8"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute -right-3 -top-6 text-8xl font-black text-white/5"
                      >
                        0{n + 1}
                      </span>
                      <h4 className="relative text-2xl font-black text-lime">{name}</h4>
                      <p className="relative mt-4 font-bold leading-relaxed">
                        {t(`dimension${n}Blurb`)}
                      </p>
                      <p className="relative mt-4 text-sm leading-relaxed text-navy-foreground/85">
                        {t(`dimension${n}Detail`)}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {flag(c, "howVisible") && (
          <section
            id="smart-snapshot"
            aria-labelledby="snapshot-heading"
            className="landing-anchor mx-auto max-w-6xl px-5 py-14 sm:py-20"
          >
            <span id="how-it-works" className="landing-anchor" aria-hidden="true" />
            <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-14">
              <div>
                <p className="eyebrow text-navy/70">Free Smart Snapshot</p>
                <h2
                  id="snapshot-heading"
                  className="mt-4 text-3xl font-black leading-tight sm:text-4xl"
                >
                  {t("howTitle")}
                </h2>
                <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
                  {t("howBody")}
                </p>
                <SnapshotLink content={c} className="mt-7" />
              </div>
              <aside
                className="rounded-3xl border border-navy/10 bg-lime/20 p-6 sm:p-8"
                aria-label="Your Snapshot report choices"
              >
                <p className="eyebrow text-navy/70">Your perspective, explored further</p>
                <h3 className="mt-4 text-2xl font-black">{t("emailTitle")}</h3>
                <p className="mt-4 leading-relaxed text-muted-foreground">{t("emailBody")}</p>
              </aside>
            </div>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {stages.map((Icon, n) => (
                <li key={n} className="card-elevated p-6 sm:p-8">
                  <Icon className="h-7 w-7 text-navy" aria-hidden="true" />
                  <p className="mt-6 text-xs font-bold uppercase tracking-widest text-navy/70">
                    {t(`benefit${n}Label`)}
                  </p>
                  <h3 className="mt-3 text-xl font-extrabold">{t(`benefit${n}Title`)}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {t(`benefit${n}Body`)}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-7 max-w-4xl text-sm leading-relaxed text-muted-foreground">
              {t("howNote")}
            </p>
          </section>
        )}

        {flag(c, "beginVisible") && (
          <section
            id="begin"
            aria-labelledby="begin-heading"
            className="landing-anchor surface-blush"
          >
            <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
              <p className="eyebrow text-navy/70">Two ways to begin</p>
              <h2
                id="begin-heading"
                className="mt-4 max-w-3xl text-3xl font-black leading-tight sm:text-4xl"
              >
                {t("beginTitle")}
              </h2>
              <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
                {t("beginBody")}
              </p>
              <div className="mt-9 grid gap-6 md:grid-cols-2">
                <article className="card-elevated flex flex-col p-7 sm:p-9">
                  <Compass className="h-8 w-8" aria-hidden="true" />
                  <p className="eyebrow mt-7 text-navy/70">Start with clarity</p>
                  <h3 className="mt-3 text-2xl font-black">{t("snapshotPathTitle")}</h3>
                  <p className="mt-4 flex-1 leading-relaxed text-muted-foreground">
                    {t("snapshotPathBody")}
                  </p>
                  <SnapshotLink content={c} className="mt-7" />
                </article>
                <article className="card-elevated flex flex-col p-7 sm:p-9">
                  <MessageCircle className="h-8 w-8" aria-hidden="true" />
                  <p className="eyebrow mt-7 text-navy/70">Start a conversation</p>
                  <h3 className="mt-3 text-2xl font-black">{t("conversationPathTitle")}</h3>
                  <p className="mt-4 flex-1 leading-relaxed text-muted-foreground">
                    {t("conversationPathBody")}
                  </p>
                  <ConversationLink content={c} className="mt-7" />
                </article>
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
            <div className="grid gap-9 lg:grid-cols-[1fr_1.3fr] lg:items-center lg:gap-16">
              <Portrait key={t("portraitUrl")} url={t("portraitUrl")} alt={t("portraitAlt")} />
              <div>
                <p className="eyebrow text-navy/70">Meet Nkoyo</p>
                <h2 id="about-heading" className="mt-4 text-3xl font-black sm:text-4xl">
                  {t("aboutTitle")}
                </h2>
                <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">
                  {t("aboutBody")}
                </p>
                <ConversationLink content={c} className="mt-7" />
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {t("bookingBody")}
                </p>
              </div>
            </div>
          </section>
        )}

        {flag(c, "testimonialsVisible") && testimonials.length > 0 && (
          <section
            aria-labelledby="testimonials-heading"
            className="border-y border-border bg-blush/50"
          >
            <div className="mx-auto max-w-6xl px-5 py-14 sm:py-20">
              <p className="eyebrow text-navy/70">In our clients’ words</p>
              <h2 id="testimonials-heading" className="mt-4 text-3xl font-black sm:text-4xl">
                {t("testimonialsTitle")}
              </h2>
              <div className="mt-9 grid gap-6 md:grid-cols-2">
                {testimonials.map((n) => (
                  <figure key={n} className="rounded-3xl bg-white p-7 sm:p-9">
                    <Quote className="h-7 w-7 text-magenta" aria-hidden="true" />
                    <blockquote className="mt-5 text-xl font-bold leading-relaxed">
                      “{t(`testimonial${n}Quote`)}”
                    </blockquote>
                    <figcaption className="mt-6">
                      <p className="font-semibold">{t(`testimonial${n}Attribution`)}</p>
                      {t(`testimonial${n}Source`) && (
                        <a
                          className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4"
                          href={t(`testimonial${n}Source`)}
                        >
                          Read the original testimonial ↗
                        </a>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {children}
        {flag(c, "closingVisible") && (
          <section aria-labelledby="closing-heading" className="bg-navy-deep text-navy-foreground">
            <div className="mx-auto max-w-4xl px-5 py-14 text-center sm:py-20">
              <h2
                id="closing-heading"
                className="text-balance-tight text-3xl font-black sm:text-5xl"
              >
                {t("closingTitle")}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-navy-foreground/85">
                {t("closingBody")}
              </p>
              <div className="home-actions mx-auto mt-8 max-w-2xl">
                <SnapshotLink content={c} />
                <ConversationLink content={c} dark />
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter
        navigationHeading="Explore Iban Ison"
        footerLinks={links(c, "footerLinks")}
        contactEmail={t("contactEmail")}
      />
    </div>
  );
}
