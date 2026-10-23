import { useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { homeDefaults, text, links, lines, flag, type Content } from "./content";
import "./homepage.css";

function BrandStrip({ items }: { items: string[] }) {
  const [paused, setPaused] = useState(false);
  return (
    <div className="home-brand-strip" role="region" aria-label="Our connected perspective">
      <div className="home-strip-viewport">
        <div className="home-strip-track" data-paused={paused}>
          {[0, 1].map((copy) => (
            <ul className="home-strip-group" key={copy} aria-hidden={copy === 1 || undefined}>
              {items.map((phrase, n) => (
                <li key={`${n}-${phrase}`}>
                  <span>{phrase}</span>
                  <span aria-hidden="true">✳</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="home-strip-control"
        aria-label={paused ? "Resume scrolling text" : "Pause scrolling text"}
        title={paused ? "Resume scrolling text" : "Pause scrolling text"}
        onClick={() => setPaused(!paused)}
      >
        {paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}

function SnapshotLink({
  content,
  label,
  className = "",
}: {
  content: Content;
  label?: string;
  className?: string;
}) {
  return (
    <a href={text(content, "ctaHref")} className={`home-button home-button--lime ${className}`}>
      {label || text(content, "ctaLabel")}
      <ArrowUpRight size={18} aria-hidden="true" />
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
  return href ? (
    <a
      href={href}
      className={`home-button home-button--outline ${dark ? "home-button--light" : ""} ${className}`}
    >
      {text(content, "bookingLabel")}
      <ArrowUpRight size={18} aria-hidden="true" />
    </a>
  ) : null;
}
function BrandPhoto({
  url,
  alt,
  kind,
}: {
  url: string;
  alt: string;
  kind: "hero" | "challenge" | "founder";
}) {
  const [failed, setFailed] = useState(false);
  return url && !failed ? (
    <img
      src={url}
      srcSet={
        kind === "challenge" && url === "/brand/collaboration.webp"
          ? "/brand/collaboration-1280.webp 1280w, /brand/collaboration.webp 1920w, /brand/collaboration-2560.webp 2560w"
          : undefined
      }
      sizes={
        kind === "challenge"
          ? "(max-width: 600px) 90vw, (max-width: 1100px) 45vw, 560px"
          : undefined
      }
      alt={alt}
      className={`home-photo home-photo--${kind}`}
      width={kind === "hero" ? 1919 : kind === "challenge" ? 1920 : 1122}
      height={kind === "hero" ? 1141 : kind === "challenge" ? 1282 : 1402}
      loading={kind === "hero" ? "eager" : "lazy"}
      fetchPriority={kind === "hero" ? "high" : "auto"}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`home-photo-fallback home-photo-fallback--${kind}`}>
      <span className="home-eyebrow">Iban Ison Solutions</span>
      <p>
        People.
        <br />
        Purpose.
        <br />
        <em>Possibility.</em>
      </p>
      <span>Organizational strategy for mission-driven leaders.</span>
    </div>
  );
}
function ProductScreen({
  url,
  alt,
  secondary = false,
}: {
  url: string;
  alt: string;
  secondary?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return null;
  return (
    <div
      className={`home-product-screen ${secondary ? "home-product-screen--back" : "home-product-screen--front"}`}
    >
      <div className="home-browser-bar" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>Smart Snapshot</span>
      </div>
      <img
        src={url}
        alt={alt}
        width={1080}
        height={960}
        loading="lazy"
        onError={() => setFailed(true)}
      />
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
  const navigation = links(c, "navigationLinks").map((item) =>
    item.label === "Insights & Resources" && item.href === "/resources" && hasInsights
      ? { ...item, href: "/#insights-resources" }
      : item,
  );
  const testimonials = [0, 1].filter(
    (n) => t(`testimonial${n}Quote`) && t(`testimonial${n}Attribution`),
  );
  const faqs = [0, 1, 2, 3, 4, 5].filter((n) => t(`faq${n}Question`) && t(`faq${n}Answer`));
  return (
    <div className="landing-page premium-home">
      <a href="#main-content" className="landing-skip-link">
        Skip to content
      </a>
      <SiteHeader navItems={navigation} cta={{ label: t("ctaLabel"), href: t("ctaHref") }} />
      <main id="main-content" tabIndex={-1}>
        <section aria-labelledby="home-heading" className="home-hero">
          <div className="home-shell home-hero-grid">
            <div className="home-hero-copy">
              <p className="home-eyebrow home-eyebrow--light">{t("heroEyebrow")}</p>
              <h1 id="home-heading" aria-label={`${t("heroTitle")} ${t("heroHighlight")}`}>
                {t("heroTitle")} <span>{t("heroHighlight")}</span>
              </h1>
              <p className="home-hero-description">{t("heroDescription")}</p>
              <div className="home-button-row">
                <SnapshotLink content={c} className="home-button--pink" />
              </div>
              <p className="home-hero-note">{t("heroNote")}</p>
            </div>
            <figure className="home-hero-portrait">
              <div className="home-portrait-arch" aria-hidden="true" />
              <span className="home-hero-cross" aria-hidden="true">
                ✳
              </span>
              <BrandPhoto
                key={t("heroImageUrl")}
                url={t("heroImageUrl")}
                alt={t("heroImageAlt")}
                kind="hero"
              />
              <figcaption>{t("heroImageCaption")}</figcaption>
            </figure>
          </div>
          <div className="home-hero-baseline home-shell">
            <span>{t("audience")}</span>
            <span aria-hidden="true">Culture / Capacity / Compliance</span>
          </div>
        </section>
        {flag(c, "stripVisible") && lines(c, "stripItems").length > 0 && (
          <BrandStrip items={lines(c, "stripItems")} />
        )}
        {flag(c, "approachVisible") && (
          <section
            id="approach"
            aria-labelledby="approach-heading"
            className="home-section home-challenge landing-anchor"
          >
            <div className="home-shell home-challenge-grid">
              <figure className="home-challenge-image">
                <BrandPhoto
                  key={t("approachImageUrl")}
                  url={t("approachImageUrl")}
                  alt={t("approachImageAlt")}
                  kind="challenge"
                />
                <div className="home-image-index" aria-hidden="true">
                  <span>C</span>
                  <span>C</span>
                  <span>C</span>
                </div>
                <figcaption className="home-image-caption">{t("approachNote")}</figcaption>
              </figure>
              <div className="home-challenge-copy">
                <p className="home-eyebrow">{t("approachEyebrow")}</p>
                <h2 id="approach-heading">{t("approachTitle")}</h2>
                <p className="home-body">{t("approachBody")}</p>
                <a
                  href={flag(c, "dimensionsVisible") ? "#impact-triad" : t("ctaHref")}
                  className="home-text-link"
                >
                  The Impact Triad™
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        )}
        {flag(c, "dimensionsVisible") && (
          <section
            id="impact-triad"
            aria-labelledby="dimensions-heading"
            className="home-section home-triad landing-anchor"
          >
            <div className="home-shell">
              <div className="home-section-intro">
                <p className="home-eyebrow">{t("dimensionsEyebrow")}</p>
                <h2 id="dimensions-heading">{t("dimensionsTitle")}</h2>
                <p className="home-body">{t("dimensionsBody")}</p>
              </div>
              <div className="home-triad-grid">
                {["Culture", "Capacity", "Compliance"].map((name, n) => (
                  <article key={name}>
                    <div className="home-triad-top">
                      <div
                        className={`home-triad-symbol home-triad-symbol--${n}`}
                        aria-hidden="true"
                      >
                        <i />
                        <i />
                        <i />
                      </div>
                      <span className="home-index">0{n + 1}</span>
                    </div>
                    <h3>{name}</h3>
                    <p className="home-triad-blurb">{t(`dimension${n}Blurb`)}</p>
                    <p className="home-body">{t(`dimension${n}Detail`)}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
        {flag(c, "howVisible") && (
          <section
            id="smart-snapshot"
            aria-labelledby="snapshot-heading"
            className="home-section home-process landing-anchor"
          >
            <span id="how-it-works" className="landing-anchor" aria-hidden="true" />
            <div className="home-shell">
              <div className="home-process-intro">
                <div>
                  <p className="home-eyebrow">How the Snapshot works</p>
                  <h2 id="snapshot-heading">{t("howTitle")}</h2>
                </div>
                <p className="home-body">{t("howBody")}</p>
              </div>
              <ol className="home-process-line">
                {[0, 1, 2].map((n) => (
                  <li key={n}>
                    <span className="home-step-number">{t(`benefit${n}Label`)}</span>
                    <h3>{t(`benefit${n}Title`)}</h3>
                    <p className="home-body">{t(`benefit${n}Body`)}</p>
                  </li>
                ))}
              </ol>
              <div className="home-process-footer">
                <p>{t("howNote")}</p>
                <a className="home-text-link" href={t("ctaHref")}>
                  {t("ctaLabel")}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        )}
        {flag(c, "showcaseVisible") && (
          <section aria-labelledby="showcase-heading" className="home-showcase home-section">
            <div className="home-shell">
              <div className="home-showcase-grid">
                <div className="home-showcase-copy">
                  <p className="home-eyebrow home-eyebrow--light">{t("showcaseEyebrow")}</p>
                  <h2 id="showcase-heading">{t("showcaseTitle")}</h2>
                  <p className="home-body">{t("showcaseBody")}</p>
                  <SnapshotLink content={c} label={t("showcaseCtaLabel")} />
                  <div className="home-report-note">
                    <h3>{t("emailTitle")}</h3>
                    <p>{t("emailBody")}</p>
                  </div>
                </div>
                <figure className="home-product-composition">
                  <ProductScreen
                    key={t("snapshotDetailImageUrl")}
                    url={t("snapshotDetailImageUrl")}
                    alt={t("snapshotDetailImageAlt")}
                    secondary
                  />
                  <ProductScreen
                    key={t("snapshotImageUrl")}
                    url={t("snapshotImageUrl")}
                    alt={t("snapshotImageAlt")}
                  />
                  <figcaption>{t("snapshotImageCaption")}</figcaption>
                </figure>
              </div>
              {flag(c, "beginVisible") && (
                <div id="begin" className="home-pathways landing-anchor">
                  <div>
                    <h3>{t("beginTitle")}</h3>
                    <p>{t("beginBody")}</p>
                  </div>
                  <div>
                    <h4>{t("snapshotPathTitle")}</h4>
                    <p>{t("snapshotPathBody")}</p>
                    <a href={t("ctaHref")} className="home-text-link">
                      {t("ctaLabel")}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </div>
                  <div>
                    <h4>{t("conversationPathTitle")}</h4>
                    <p>{t("conversationPathBody")}</p>
                    {t("bookingHref") && (
                      <a href={t("bookingHref")} className="home-text-link">
                        {t("bookingLabel")}
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
        {flag(c, "aboutVisible") && (
          <section
            id="about"
            aria-labelledby="about-heading"
            className="home-section home-founder landing-anchor"
          >
            <div className="home-shell home-founder-grid">
              <figure className="home-founder-image">
                <BrandPhoto
                  key={t("portraitUrl")}
                  url={t("portraitUrl")}
                  alt={t("portraitAlt")}
                  kind="founder"
                />
                <figcaption>
                  <span>{t("aboutName")}</span>
                  <span>Founder & Chief Impact Strategist</span>
                </figcaption>
              </figure>
              <div>
                <p className="home-eyebrow">{t("aboutEyebrow")}</p>
                <h2 id="about-heading">{t("aboutTitle")}</h2>
                <p className="home-body">{t("aboutBody")}</p>
                <ul className="home-credentials">
                  {lines(c, "aboutCredentials").map((value) => (
                    <li key={value}>{value}</li>
                  ))}
                </ul>
                <ConversationLink content={c} />
                <p className="home-founder-note">{t("bookingBody")}</p>
              </div>
            </div>
          </section>
        )}
        {flag(c, "testimonialsVisible") && testimonials.length > 0 && (
          <section
            aria-labelledby="testimonials-heading"
            className="home-section home-testimonials"
          >
            <div className="home-shell">
              <div className="home-testimonial-intro">
                <p className="home-eyebrow home-eyebrow--light">In our clients’ words</p>
                <h2 id="testimonials-heading">{t("testimonialsTitle")}</h2>
              </div>
              <div className="home-quotes">
                {testimonials.map((n) => (
                  <figure key={n}>
                    <span className="home-quote-mark" aria-hidden="true">
                      “
                    </span>
                    <blockquote>{t(`testimonial${n}Quote`)}</blockquote>
                    <figcaption>
                      <span>{t(`testimonial${n}Attribution`)}</span>
                      {t(`testimonial${n}Source`) && (
                        <a
                          href={t(`testimonial${n}Source`)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Read the original testimonial
                          <span className="sr-only"> (opens in a new tab)</span>
                          <ArrowUpRight size={16} aria-hidden="true" />
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
        {flag(c, "faqVisible") && faqs.length > 0 && (
          <section aria-labelledby="faq-heading" className="home-section home-faq">
            <div className="home-shell home-faq-grid">
              <div>
                <p className="home-eyebrow">{t("faqEyebrow")}</p>
                <h2 id="faq-heading">{t("faqTitle")}</h2>
                <p className="home-body">{t("faqBody")}</p>
                <ConversationLink content={c} />
              </div>
              <div className="home-faq-list">
                {faqs.map((n) => (
                  <details key={n}>
                    <summary>
                      {t(`faq${n}Question`)}
                      <span aria-hidden="true">+</span>
                    </summary>
                    <p>{t(`faq${n}Answer`)}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}
        {flag(c, "closingVisible") && (
          <section aria-labelledby="closing-heading" className="home-closing">
            <div className="home-shell home-closing-grid">
              <span className="home-closing-symbol" aria-hidden="true">
                ✳
              </span>
              <div>
                <p className="home-eyebrow home-eyebrow--light">Let’s design what’s next</p>
                <h2 id="closing-heading">{t("closingTitle")}</h2>
                <p className="home-body">{t("closingBody")}</p>
              </div>
              <div className="home-closing-actions">
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
        statement={t("footerStatement")}
        booking={
          t("bookingHref") ? { label: t("bookingLabel"), href: t("bookingHref") } : undefined
        }
      />
    </div>
  );
}
