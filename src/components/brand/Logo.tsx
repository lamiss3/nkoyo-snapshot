import { Link } from "@tanstack/react-router";
import { brand } from "@/config/brand";

export function Logo({ tone = "navy" }: { tone?: "navy" | "light" }) {
  const color = tone === "light" ? "text-navy-foreground" : "text-navy";
  return (
    <Link to="/" className="flex items-center gap-3" aria-label={`${brand.orgName} home`}>
      {brand.logo.imageUrl ? (
        <img src={brand.logo.imageUrl} alt={brand.orgName} className="h-9 w-auto" />
      ) : (
        <span className={`flex flex-col leading-none ${color}`}>
          <span className="font-display text-lg font-extrabold tracking-tight">
            {brand.logo.wordmark}
            <span className="text-magenta">®</span>
          </span>
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.3em] opacity-70">
            {brand.logo.wordmarkSub}
          </span>
        </span>
      )}
    </Link>
  );
}
