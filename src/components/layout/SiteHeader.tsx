import type { LinkValue } from "@/cms/content";
import { Logo } from "@/components/brand/Logo";

const navItems = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "About Nkoyo", href: "/#about" },
];

export function SiteHeader({
  navItems: items = navItems,
  cta = { label: "Start the Snapshot", href: "/snapshot" },
}: {
  navItems?: LinkValue[];
  cta?: LinkValue;
}) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-5 pt-3 sm:flex sm:justify-between sm:gap-4 sm:py-4">
        <div className="flex min-w-0 items-center">
          <Logo />
        </div>
        <nav
          aria-label="Main"
          className="contents sm:flex sm:flex-wrap sm:justify-end sm:items-center sm:gap-6"
        >
          <ul className="col-span-2 row-start-2 flex items-center justify-center flex-wrap gap-x-8 sm:gap-6">
            {items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-navy/80 transition-colors hover:text-navy"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={cta.href}
            className="snapshot-header-cta col-start-2 row-start-1 inline-flex min-h-11 items-center justify-center rounded-full bg-magenta px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-magenta/90 sm:px-5"
          >
            {cta.label}
          </a>
        </nav>
      </div>
    </header>
  );
}
