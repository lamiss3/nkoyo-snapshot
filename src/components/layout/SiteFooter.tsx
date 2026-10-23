import { Link } from "@tanstack/react-router";
import { brand } from "@/config/brand";
import type { LinkValue } from "@/cms/content";
import { legal } from "@/config/legal";

const socials = (
  [
    ["Instagram", brand.social.instagram],
    ["LinkedIn", brand.social.linkedin],
    ["YouTube", brand.social.youtube],
  ] as Array<[string, string | null]>
).filter((item): item is [string, string] => Boolean(item[1]));
const linkClass = "inline-flex min-h-11 items-center hover:text-lime";

export function SiteFooter({
  footerLinks,
  contactEmail = brand.contactEmail,
  navigationHeading = "Snapshot",
  statement = brand.tagline,
  booking,
}: {
  footerLinks?: LinkValue[];
  contactEmail?: string | null;
  navigationHeading?: string;
  statement?: string;
  booking?: LinkValue | undefined;
}) {
  return (
    <footer className="no-print bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr_1.2fr]">
        <div>
          <p className="font-display text-xl font-extrabold">
            {brand.logo.wordmark}
            <span className="text-magenta-soft">®</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] opacity-80">
            {brand.logo.wordmarkSub}
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-foreground/85">
            {statement}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-navy-foreground/80">
            {navigationHeading}
          </h2>
          <ul className="mt-3 text-sm">
            {(
              footerLinks ?? [
                { label: "Start the Snapshot", href: "/snapshot" },
                { label: "How it works", href: "/#how-it-works" },
                { label: "About Nkoyo", href: "/#about" },
              ]
            ).map((item) => (
              <li key={item.href}>
                <a href={item.href} className={linkClass}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-navy-foreground/80">
            Legal
          </h2>
          <ul className="mt-3 text-sm">
            <li>
              <Link to="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className={linkClass}>
                Terms of Use
              </Link>
            </li>
          </ul>
        </div>
        {(contactEmail || socials.length > 0) && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-navy-foreground/80">
              Contact
            </h2>
            <ul className="mt-3 text-sm">
              {contactEmail && (
                <li>
                  <a href={`mailto:${contactEmail}`} className={`${linkClass} break-all`}>
                    {contactEmail}
                  </a>
                </li>
              )}
              {booking && (
                <li>
                  <a href={booking.href} className={linkClass}>
                    {booking.label} ↗
                  </a>
                </li>
              )}
              {socials.map(([label, href]) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
                    {label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-6 text-xs text-navy-foreground/80">
          © {new Date().getFullYear()} {legal.operatorName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
