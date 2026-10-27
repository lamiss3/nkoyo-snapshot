import { useId, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, RefreshCw, ExternalLink, TriangleAlert } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { adminButton } from "./ui";
import { creditsResultSchema, creditDollars } from "./credits";

async function fetchBalance(force: boolean, signal: AbortSignal) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Balance unavailable");
  const response = await fetch(`/api/admin/openrouter-credits${force ? "?refresh=1" : ""}`, {
    headers: { Authorization: `Bearer ${data.session.access_token}` },
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw new Error("Balance unavailable");
  return creditsResultSchema.parse(await response.json());
}

export function OpenRouterCredits({ userId }: { userId: string }) {
  const titleId = useId();
  const refreshRequested = useRef(false);
  const [open, setOpen] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const query = useQuery({
    queryKey: ["admin", "openrouter-credits", userId],
    queryFn: ({ signal }) => {
      const force = refreshRequested.current;
      refreshRequested.current = false;
      return fetchBalance(force, signal);
    },
    staleTime: 450_000,
    refetchInterval: 450_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const result = query.isError ? undefined : query.data;
  const available = result?.available === true;
  const state = available ? result.status : "unavailable";
  const label = available
    ? creditDollars(result.remaining)
    : query.isPending
      ? "Checking balance…"
      : "Balance unavailable";
  const cooldown = result?.nextManualRefreshAt ? Date.parse(result.nextManualRefreshAt) : 0;
  useEffect(() => {
    if (!open || cooldown <= Date.now()) return;
    const timer = window.setTimeout(() => setClock(Date.now()), cooldown - Date.now() + 50);
    return () => window.clearTimeout(timer);
  }, [open, cooldown, clock]);
  const coolingDown = cooldown > Math.max(clock, Date.now());
  return (
    <div className="admin-credit-control">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`admin-credit-trigger admin-credit--${state}`}
            aria-label={`OpenRouter credits: ${label}${available ? `, ${state} balance` : ""}`}
          >
            <Wallet size={16} aria-hidden="true" />
            <span>{label}</span>
            {available && state !== "healthy" && <TriangleAlert size={13} aria-hidden="true" />}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="admin-portal admin-credit-popover"
          align="end"
          sideOffset={8}
          aria-labelledby={titleId}
        >
          <div className="admin-credit-popover-heading">
            <h2 id={titleId}>OpenRouter credits</h2>
            {available && (
              <span className={`admin-credit-state admin-credit--${state}`}>{state}</span>
            )}
          </div>
          {!available && (
            <p className="admin-credit-notice" role="status">
              {query.isPending
                ? "Checking the account balance…"
                : "Balance unavailable. Refresh to try again."}
            </p>
          )}
          {available && state !== "healthy" && (
            <p className="admin-credit-notice" role="status">
              {state === "critical"
                ? "Credits are running low."
                : "Balance is at or below the warning threshold."}{" "}
              Add credits in OpenRouter when needed.
            </p>
          )}
          <dl className="admin-credit-totals">
            <div>
              <dt>Remaining credits</dt>
              <dd>{available ? creditDollars(result.remaining) : "Unavailable"}</dd>
            </div>
            <div>
              <dt>Total purchased credits</dt>
              <dd>{available ? creditDollars(result.totalCredits) : "Unavailable"}</dd>
            </div>
            <div>
              <dt>Total usage</dt>
              <dd>{available ? creditDollars(result.totalUsage) : "Unavailable"}</dd>
            </div>
            <div>
              <dt>Last successful refresh</dt>
              <dd>
                {result?.lastSuccessfulRefresh
                  ? new Date(result.lastSuccessfulRefresh).toLocaleString()
                  : "Not yet available"}
              </dd>
            </div>
          </dl>
          <div className="admin-credit-popover-actions">
            <button
              type="button"
              className={adminButton}
              disabled={query.isFetching || coolingDown}
              onClick={() => {
                refreshRequested.current = true;
                void query.refetch();
              }}
            >
              <RefreshCw size={14} aria-hidden="true" />
              {query.isFetching ? "Refreshing…" : "Refresh"}
            </button>
            <a
              className={adminButton}
              href="https://openrouter.ai/settings/credits"
              target="_blank"
              rel="noopener noreferrer"
            >
              Add credits <ExternalLink size={13} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          {coolingDown && (
            <p className="admin-credit-footnote">Refresh is available again in a few seconds.</p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
