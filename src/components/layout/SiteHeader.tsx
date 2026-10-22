import type { LinkValue } from "@/cms/content";
import { Logo } from "@/components/brand/Logo";
import { useId, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const navigationId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="site-header-shell mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3 lg:gap-5 lg:py-4">
        <div className="site-header-brand flex min-w-0 items-center">
          <Logo />
        </div>
        <a
          href={cta.href}
          className="snapshot-header-cta ml-auto inline-flex min-h-11 max-w-[55%] items-center justify-center rounded-full bg-magenta px-4 py-2 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-magenta/90 lg:order-3 lg:ml-0 lg:px-5"
        >
          {cta.label}
        </a>
        <button
          ref={menuButton}
          type="button"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls={navigationId}
          onClick={() => setOpen(!open)}
          className="site-header-menu inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border lg:hidden"
        >
          <span aria-hidden="true">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </span>
        </button>
        <nav
          id={navigationId}
          aria-label="Main"
          className={`${open ? "block" : "hidden"} w-full lg:block lg:w-auto lg:ml-auto`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              menuButton.current?.focus();
            }
          }}
        >
          <ul className="flex flex-col border-t border-border pt-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-end lg:gap-5 lg:border-0 lg:pt-0">
            {items.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-navy/80 transition-colors hover:text-navy"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
