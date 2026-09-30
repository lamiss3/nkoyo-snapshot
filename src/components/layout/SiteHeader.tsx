import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

const navItems = [
  { label: "About", href: "/#about" },
  { label: "How It Works", href: "/#how-it-works" },
];

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:flex sm:justify-between">
        <div className="flex min-w-0 items-center">
          <Logo />
        </div>
        <nav aria-label="Main" className="flex shrink-0 items-center gap-2 sm:gap-6">
          <ul className="hidden items-center gap-6 sm:flex">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-sm font-semibold text-navy/80 transition-colors hover:text-magenta"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <Link
            to="/snapshot"
            className="inline-flex min-h-11 items-center rounded-full bg-magenta px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-magenta/90"
          >
            Start the Snapshot
          </Link>
        </nav>
      </div>
    </header>
  );
}
