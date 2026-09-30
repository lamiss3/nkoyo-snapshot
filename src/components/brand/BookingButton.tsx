import { useState } from "react";
import { brand, bookingCopy } from "@/config/brand";
import { logEvent } from "@/lib/snapshot-api";
import { cn } from "@/lib/utils";

interface Props {
  sessionKey?: string | null;
  className?: string;
  label?: string;
}

/**
 * Booking CTA. If no booking URL is configured, the button honestly states
 * that scheduling is not yet connected instead of opening an invented link.
 */
export function BookingButton({ sessionKey = null, className, label }: Props) {
  const [notice, setNotice] = useState(false);
  const configured = Boolean(brand.bookingUrl);

  const base = cn(
    "inline-flex min-h-12 items-center justify-center rounded-full bg-magenta px-8 py-3 text-base font-bold text-primary-foreground shadow-card transition-transform hover:-translate-y-0.5 hover:bg-magenta/90 disabled:opacity-60",
    className,
  );

  const handleClick = () => {
    void logEvent("booking_cta_click", sessionKey, { configured });
    if (!configured) setNotice(true);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {configured ? (
        <a href={brand.bookingUrl!} target="_blank" rel="noreferrer" className={base} onClick={handleClick}>
          {label ?? bookingCopy.cta}
        </a>
      ) : (
        <button type="button" className={base} onClick={handleClick}>
          {label ?? bookingCopy.cta}
        </button>
      )}
      {!configured && notice && (
        <p role="status" className="max-w-md text-sm text-muted-foreground">
          Online booking is not available yet.
        </p>
      )}
    </div>
  );
}
