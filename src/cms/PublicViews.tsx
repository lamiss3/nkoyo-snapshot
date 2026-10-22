import { useEffect, useState, type ReactNode } from "react";
import "./cms.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  text,
  flag,
  order,
  links,
  lines,
  campaignEligible,
  youtubeId,
  type ContentKind,
} from "./content";
import type { PublicBundle, PublicItem } from "./service.server";
import { contentEvent, resourceDownload } from "./actions";
import { homepageContentGroups } from "./homepage-content";
const button = "snapshot-cta mt-5";
const libraryPath: Partial<Record<ContentKind, string>> = {
  blog: "/insights",
  video: "/videos",
  webinar: "/webinars",
  resource: "/resources",
};
const sorted = (items: PublicItem[]) =>
  [...items].sort(
    (a, b) =>
      Number(flag(b.content, "featured")) - Number(flag(a.content, "featured")) ||
      order(a.content) - order(b.content) ||
      (b.date ?? "").localeCompare(a.date ?? ""),
  );
function measurementAllowed() {
  return (
    localStorage.getItem("website-measurement") === "yes" &&
    navigator.doNotTrack !== "1" &&
    !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  );
}
function measure(
  item: PublicItem,
  type:
    | "cta_click"
    | "resource_access"
    | "registration_form_opened"
    | "popup_impression"
    | "popup_dismissal"
    | "popup_click",
) {
  try {
    if (!measurementAllowed()) return;
    let key = sessionStorage.getItem("website-event-session");
    if (!key) {
      key = crypto.randomUUID();
      sessionStorage.setItem("website-event-session", key);
    }
    void contentEvent({ data: { id: item.id, key, type, consent: true } }).catch(() => {});
  } catch {
    /* Optional measurement never blocks content. */
  }
}
export function ContentCard({
  item,
  preview = false,
  headingLevel: Heading = "h2",
}: {
  item: PublicItem;
  preview?: boolean;
  headingLevel?: "h2" | "h4";
}) {
  const c = item.content;
  const videoId = item.kind === "video" ? youtubeId(text(c, "youtubeUrl")) : null;
  const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
  const videoLinkLabel = `Watch ${text(c, "title")} on YouTube (opens in a new tab)`;
  const href =
    item.kind === "blog" ? text(c, "externalUrl") : `${libraryPath[item.kind]}/${item.slug}`;
  const cover = text(c, "coverUrl") ? (
    <img
      src={text(c, "coverUrl")}
      alt={text(c, "coverAlt")}
      className="aspect-[16/9] w-full object-cover"
      loading="lazy"
      onError={(event) => {
        event.currentTarget.hidden = true;
      }}
    />
  ) : null;
  return (
    <article
      className={`card-elevated min-w-0 overflow-hidden ${flag(c, "featured") ? "ring-1 ring-magenta/25" : ""}`}
    >
      {cover && videoUrl ? (
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={videoLinkLabel}
          className="block focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-magenta"
          onClick={() => measure(item, "cta_click")}
        >
          {cover}
        </a>
      ) : (
        cover
      )}
      <div className="p-6">
        <p className="eyebrow text-navy/70">{text(c, "category") || item.kind}</p>
        <Heading className="mt-3 text-2xl font-black break-words">
          {videoUrl ? (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={videoLinkLabel}
              className="rounded-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-magenta"
              onClick={() => measure(item, "cta_click")}
            >
              {text(c, "title")}
            </a>
          ) : (
            text(c, "title")
          )}
        </Heading>
        {item.kind === "blog" && text(c, "date") && (
          <time className="mt-2 block text-sm text-muted-foreground" dateTime={text(c, "date")}>
            {new Date(text(c, "date")).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}
          </time>
        )}
        <p className="mt-4 whitespace-pre-line leading-relaxed text-muted-foreground">
          {text(c, "description")}
        </p>
        {item.kind === "video" ? (
          text(c, "relatedResourceHref") && (
            <a
              className="mt-3 inline-flex min-h-11 items-center underline"
              href={text(c, "relatedResourceHref")}
            >
              Related resource
            </a>
          )
        ) : preview ? (
          <p className="mt-5 text-sm font-bold">
            {item.kind === "blog" ? "Read article on Kit" : "Open detail page"} · preview only
          </p>
        ) : (
          <a
            href={href}
            className={button}
            {...(item.kind === "blog" ? { target: "_blank", rel: "noreferrer" } : {})}
            onClick={() => measure(item, "cta_click")}
          >
            {item.kind === "blog"
              ? "Read article ↗"
              : item.kind === "webinar"
                ? "View webinar"
                : "Explore resource"}
          </a>
        )}
      </div>
    </article>
  );
}
export function FeaturedContent({
  items,
  title = "Insights & Resources",
  description = "",
}: {
  items: PublicItem[];
  title?: string;
  description?: string;
}) {
  const groups = homepageContentGroups(items);
  if (!groups.length) return null;
  return (
    <section
      id="insights-resources"
      aria-labelledby="insights-heading"
      className="landing-anchor mx-auto max-w-6xl px-5 py-14 sm:py-20"
    >
      <p className="eyebrow text-navy/70">Keep exploring</p>
      <h2 id="insights-heading" className="mt-4 text-3xl font-black sm:text-4xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {groups.map((group) => (
        <div key={group.kind} className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black">{group.label}</h3>
            <a
              href={group.path}
              className="inline-flex min-h-11 items-center text-sm font-bold underline underline-offset-4"
            >
              Explore {group.label.toLowerCase()} →
            </a>
          </div>
          <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <ContentCard key={item.id} item={item} headingLevel="h4" />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
export function MarketingShell({
  bundle,
  path,
  children,
}: {
  bundle: PublicBundle;
  path: string;
  children: ReactNode;
}) {
  return (
    <div className="landing-page min-h-dvh bg-blush">
      <a className="landing-skip-link" href="#main-content">
        Skip to content
      </a>
      <SiteHeader
        navItems={links(bundle.home, "navigationLinks")}
        cta={
          text(bundle.home, "bookingHref")
            ? { label: text(bundle.home, "bookingLabel"), href: text(bundle.home, "bookingHref") }
            : { label: text(bundle.home, "ctaLabel"), href: text(bundle.home, "ctaHref") }
        }
      />
      <main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
        {children}
      </main>
      <SiteFooter
        navigationHeading="Explore Iban Ison"
        footerLinks={links(bundle.home, "footerLinks")}
        contactEmail={text(bundle.home, "contactEmail")}
      />
      <MarketingFeatures bundle={bundle} path={path} />
    </div>
  );
}
export function ContentLibrary({
  bundle,
  kind,
}: {
  bundle: PublicBundle;
  kind: "blog" | "video" | "webinar" | "resource";
}) {
  const [category, setCategory] = useState("");
  const items = sorted(
    bundle.items.filter(
      (i) =>
        i.kind === kind ||
        (kind === "resource" && i.kind === "webinar" && flag(i.content, "inResources")),
    ),
  );
  const categories = [...new Set(items.map((i) => text(i.content, "category")).filter(Boolean))];
  const title = { blog: "Insights", video: "Videos", webinar: "Webinars", resource: "Resources" }[
    kind
  ];
  return (
    <MarketingShell bundle={bundle} path={libraryPath[kind]!}>
      <p className="eyebrow text-magenta">Iban Ison Solutions</p>
      <h1 className="mt-4 text-4xl font-black sm:text-5xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
        {kind === "blog"
          ? "Articles from Nkoyo. Read the full article on Kit."
          : "Guidance for nonprofit leaders and boards, across Culture, Capacity and Compliance."}
      </p>
      {categories.length > 0 && (
        <label className="mt-7 block max-w-sm text-sm font-bold">
          Category
          <select
            className="mt-2 min-h-11 w-full rounded-xl border bg-white px-3"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      )}
      {!items.length ? (
        <p className="mt-10 rounded-3xl border bg-white p-8 text-muted-foreground">
          {bundle.unavailable
            ? "This library is temporarily unavailable. Please check back shortly."
            : "No items have been published here yet."}
        </p>
      ) : (
        <div className="mt-9 grid items-start gap-6 md:grid-cols-2">
          {items
            .filter((i) => !category || text(i.content, "category") === category)
            .map((item) => (
              <ContentCard key={item.id} item={item} />
            ))}
        </div>
      )}
    </MarketingShell>
  );
}
export function ContentDetail({ item, preview = false }: { item: PublicItem; preview?: boolean }) {
  const c = item.content;
  const gated = item.kind === "webinar" || text(c, "access") === "registration";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await resourceDownload({ data: { id: item.id } });
      if (!result.ok) throw new Error(result.error);
      measure(item, "resource_access");
      window.location.assign(result.value);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Access failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="mx-auto max-w-3xl">
      <p className="eyebrow text-magenta">{text(c, "category") || item.kind}</p>
      <h1 className="mt-4 text-4xl font-black break-words sm:text-5xl">{text(c, "title")}</h1>
      <p className="mt-5 text-xl leading-relaxed">{text(c, "description")}</p>
      {text(c, "coverUrl") && (
        <img
          className="mt-8 aspect-video w-full rounded-3xl object-cover"
          src={text(c, "coverUrl")}
          alt=""
          loading="lazy"
        />
      )}
      <p className="mt-8 whitespace-pre-line leading-relaxed text-muted-foreground">
        {text(c, "longDescription")}
      </p>
      {text(c, "audience") && (
        <section className="mt-8">
          <h2 className="text-xl font-black">Who this is for</h2>
          <p className="mt-3">{text(c, "audience")}</p>
        </section>
      )}
      {text(c, "benefit") && <p className="mt-6 font-bold">{text(c, "benefit")}</p>}
      {lines(c, item.kind === "webinar" ? "outcomes" : "benefits").length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-black">What you’ll take away</h2>
          <ul className="mt-4 list-disc space-y-3 pl-5">
            {lines(c, item.kind === "webinar" ? "outcomes" : "benefits").map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      )}
      {text(c, "presenter") && <p className="mt-7 whitespace-pre-line">{text(c, "presenter")}</p>}
      <section className="card-elevated mt-9 p-7">
        <h2 className="text-2xl font-black">
          {gated ? "Get access by email" : "Access the resource"}
        </h2>
        {gated && <p className="mt-4 leading-relaxed">{text(c, "confirmation")}</p>}
        {preview ? (
          <p className="mt-5 font-bold">Preview only — registration and downloads are disabled.</p>
        ) : gated ? (
          <a
            className={button}
            href={text(c, "formUrl")}
            target="_blank"
            rel="noreferrer"
            onClick={() => measure(item, "registration_form_opened")}
          >
            {text(c, "ctaLabel") || "Register with Kit"} ↗
          </a>
        ) : (
          <button className={button} disabled={busy} onClick={() => void download()}>
            {busy ? "Preparing access…" : text(c, "ctaLabel") || "Get the resource"}
          </button>
        )}
        {gated && (
          <p className="mt-3 text-sm text-muted-foreground">
            The registration form opens on Kit. Registration requests this item; further promotional
            emails are a separate choice.
          </p>
        )}
        {error && (
          <p className="mt-4 text-destructive" role="alert">
            {error}
          </p>
        )}
      </section>
      {gated && text(c, "followupFormUrl") && (
        <section className="mt-7 rounded-3xl border p-6">
          <h2 className="font-black">Optional follow-up guidance</h2>
          <p className="mt-3">
            You can separately request a five-day nurture journey. You do not need to subscribe to
            receive this resource.
          </p>
          {!preview && (
            <a
              className="mt-4 inline-flex min-h-11 items-center underline"
              href={text(c, "followupFormUrl")}
              target="_blank"
              rel="noreferrer"
            >
              {text(c, "followupLabel")} ↗
            </a>
          )}
        </section>
      )}
    </article>
  );
}
export function DetailPage({
  bundle,
  kind,
  slug,
}: {
  bundle: PublicBundle;
  kind: "resource" | "webinar";
  slug: string;
}) {
  const item = bundle.items.find((i) => i.kind === kind && i.slug === slug);
  return (
    <MarketingShell bundle={bundle} path={`${libraryPath[kind]}/${slug}`}>
      {item ? (
        <>
          <ContentDetail item={item} />
          <section className="mt-14">
            <h2 className="text-2xl font-black">Explore more</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {sorted(bundle.items.filter((i) => i.kind === kind && i.id !== item.id))
                .slice(0, 2)
                .map((i) => (
                  <ContentCard key={i.id} item={i} />
                ))}
            </div>
            <a href="/snapshot" className={button}>
              Start the Snapshot
            </a>
          </section>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-black">This item is not available</h1>
          <p className="mt-5">It may be a draft, archived, or temporarily unavailable.</p>
          <a href={libraryPath[kind]} className={button}>
            Browse {kind === "resource" ? "resources" : "webinars"}
          </a>
        </>
      )}
    </MarketingShell>
  );
}
export function CampaignPreview({
  item,
  onClose,
  onClick,
}: {
  item: PublicItem;
  onClose?: (() => void) | undefined;
  onClick?: (() => void) | undefined;
}) {
  const c = item.content;
  return (
    <div className="rounded-3xl bg-white p-6 text-navy sm:p-8">
      {text(c, "imageUrl") && (
        <img
          src={text(c, "imageUrl")}
          alt=""
          className="mb-5 max-h-52 w-full rounded-2xl object-cover"
        />
      )}
      <h2 className="text-2xl font-black">{text(c, "headline")}</h2>
      <p className="mt-4 whitespace-pre-line leading-relaxed">{text(c, "description")}</p>
      {onClick ? (
        <a className={button} href={text(c, "ctaHref")} onClick={onClick}>
          {text(c, "ctaLabel")}
        </a>
      ) : (
        <p className="mt-5 font-bold">
          {text(c, "ctaLabel")} · {text(c, "ctaHref")}
        </p>
      )}
      {onClose && (
        <button className="ml-4 mt-5 min-h-11 underline" onClick={onClose}>
          Dismiss
        </button>
      )}
    </div>
  );
}
export function MarketingFeatures({ bundle, path }: { bundle: PublicBundle; path: string }) {
  const [active, setActive] = useState<PublicItem | null>(null);
  const [preferences, setPreferences] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [consent, setConsent] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    try {
      setHidden(localStorage.getItem("website-hide-promotions") === "yes");
      setConsent(measurementAllowed());
      if (localStorage.getItem("website-hide-promotions") === "yes") return;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const item = sorted(
        bundle.items.filter(
          (i) => i.kind === "popup" && campaignEligible(i.content, path, mobile, Date.now()),
        ),
      ).find((i) => {
        const storage = text(i.content, "frequency") === "session" ? sessionStorage : localStorage;
        const last = Number(storage.getItem(`website-campaign:${i.id}:${i.revision}`));
        const duration = text(i.content, "frequency") === "week" ? 604800000 : 86400000;
        return (
          !last || (text(i.content, "frequency") !== "session" && Date.now() - last > duration)
        );
      });
      if (!item) return;
      timer = setTimeout(
        () => {
          try {
            if (
              !campaignEligible(
                item.content,
                path,
                window.matchMedia("(max-width: 767px)").matches,
                Date.now(),
              ) ||
              localStorage.getItem("website-hide-promotions") === "yes"
            )
              return;
            const storage =
              text(item.content, "frequency") === "session" ? sessionStorage : localStorage;
            storage.setItem(`website-campaign:${item.id}:${item.revision}`, String(Date.now()));
            setActive(item);
            measure(item, "popup_impression");
            const end = Date.parse(text(item.content, "endsAt"));
            if (Number.isFinite(end)) {
              const expire = () => {
                const remaining = end - Date.now();
                if (remaining <= 0) setActive(null);
                else expiry = setTimeout(expire, Math.min(remaining, 2147483647));
              };
              expire();
            }
          } catch {
            setActive(null);
          }
        },
        Number(text(item.content, "delay")) * 1000,
      );
    } catch {
      /* Suppress promotions if their frequency preference cannot be stored. */
    }
    return () => {
      if (timer) clearTimeout(timer);
      if (expiry) clearTimeout(expiry);
      setActive(null);
    };
  }, [bundle, path, hidden]);
  const close = () => {
    if (active) measure(active, "popup_dismissal");
    setActive(null);
  };
  const toggleMeasure = (value: boolean) => {
    try {
      localStorage.setItem("website-measurement", value ? "yes" : "no");
      setConsent(value && measurementAllowed());
    } catch {
      setConsent(false);
    }
  };
  if (!["/", "/insights", "/videos", "/webinars", "/resources"].includes(path)) return null;
  return (
    <>
      {active &&
        !hidden &&
        (text(active.content, "mode") === "modal" ? (
          <Dialog
            open
            onOpenChange={(open) => {
              if (!open) close();
            }}
          >
            <DialogContent className="cms-dialog max-h-[90dvh] max-w-xl overflow-auto p-0">
              <DialogTitle className="sr-only">{text(active.content, "headline")}</DialogTitle>
              <DialogDescription className="sr-only">
                Website promotion. You may dismiss this message.
              </DialogDescription>
              <CampaignPreview
                item={active}
                onClose={close}
                onClick={() => measure(active, "popup_click")}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <aside
            aria-label="Website announcement"
            className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-h-[70dvh] max-w-3xl overflow-auto rounded-3xl border shadow-card"
          >
            <CampaignPreview
              item={active}
              onClose={flag(active.content, "dismissible") ? close : undefined}
              onClick={() => measure(active, "popup_click")}
            />
          </aside>
        ))}
      {(flag(bundle.home, "analyticsEnabled") || bundle.items.some((i) => i.kind === "popup")) && (
        <div className="bg-navy px-5 pb-5 text-center text-white">
          <button
            className="min-h-11 text-sm underline"
            onClick={() => setPreferences(!preferences)}
          >
            Website preferences
          </button>
          {preferences && (
            <div className="mx-auto max-w-xl rounded-2xl border border-white/20 p-5 text-left text-sm">
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={hidden}
                  onChange={(e) => {
                    try {
                      localStorage.setItem(
                        "website-hide-promotions",
                        e.target.checked ? "yes" : "no",
                      );
                      setHidden(e.target.checked);
                      close();
                    } catch {
                      setActive(null);
                    }
                  }}
                />
                Hide promotional messages
              </label>
              {flag(bundle.home, "analyticsEnabled") && (
                <label className="flex min-h-11 items-center gap-3">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => toggleMeasure(e.target.checked)}
                  />
                  Allow anonymous content interaction counts
                </label>
              )}
              <p className="mt-2 leading-relaxed">
                Measurement is optional and respects Do Not Track and Global Privacy Control. No
                assessment answers or email addresses are included. Display preferences stay in this
                browser.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
