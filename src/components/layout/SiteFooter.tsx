import { Link } from "@tanstack/react-router";
import { brand } from "@/config/brand";

const socials: Array<[string, string | null]> = [
  ["Instagram", brand.social.instagram],
  ["LinkedIn", brand.social.linkedin],
  ["YouTube", brand.social.youtube],
];

export function SiteFooter() {
  return (
    <footer className="no-print bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl font-extrabold">
            {brand.logo.wordmark}
            <span className="text-magenta-soft">®</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.3em] opacity-70">
            {brand.logo.wordmarkSub}
          </p>
          <p className="mt-4 max-w-xs text-sm opacity-80">{brand.tagline}</p>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest opacity-70">Snapshot</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/snapshot" className="hover:text-lime">
                Start the Snapshot
              </Link>
            </li>
            <li>
              <a href="/#how-it-works" className="hover:text-lime">
                How it works
              </a>
            </li>
            <li>
              <a href="/#about" className="hover:text-lime">
                About Nkoyo
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest opacity-70">Legal</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link to="/privacy" className="hover:text-lime">
                Privacy (draft)
              </Link>
            </li>
            <li>
              <Link to="/terms" className="hover:text-lime">
                Terms (draft)
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest opacity-70">Contact</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              {brand.contactEmail ? (
                <a href={`mailto:${brand.contactEmail}`} className="hover:text-lime">
                  {brand.contactEmail}
                </a>
              ) : (
                <span className="opacity-70">Contact email — not configured</span>
              )}
            </li>
            {socials.map(([label, href]) => (
              <li key={label}>
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer" className="hover:text-lime">
                    {label}
                  </a>
                ) : (
                  <span className="opacity-70">{label} — link not configured</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-6 text-xs opacity-70">
          © {new Date().getFullYear()} {brand.orgName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
