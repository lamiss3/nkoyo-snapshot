import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export const adminButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50";
export const adminInput =
  "min-h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3 py-2 text-sm";
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card-elevated min-w-0 p-5 sm:p-6 ${className}`}>{children}</section>;
}
export function PageIntro({
  description,
  children,
}: {
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      {children}
    </div>
  );
}
export function QueryState({
  queries,
  children,
}: {
  queries: { isPending: boolean; error: Error | null; refetch: () => unknown }[];
  children: ReactNode;
}) {
  const failed = queries.filter((query) => query.error);
  if (failed.length)
    return (
      <Card>
        <div role="alert">
          <h2 className="font-bold">We couldn’t load this view</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Check your connection and staff access, then try again. No records have been changed.
          </p>
          <button
            className={`${adminButton} mt-4`}
            onClick={() => queries.forEach((query) => void query.refetch())}
          >
            Try again
          </button>
        </div>
      </Card>
    );
  if (queries.some((query) => query.isPending))
    return (
      <p role="status" className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        Loading saved records…
      </p>
    );
  return <>{children}</>;
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-sm text-muted-foreground">{children}</p>;
}
export function Status({ children }: { children: string }) {
  return (
    <span
      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${/failed|error|reconcile/.test(children) ? "bg-destructive/10 text-destructive" : /completed/.test(children) ? "bg-lime text-lime-foreground" : "bg-secondary text-navy"}`}
    >
      {children.replaceAll("_", " ")}
    </span>
  );
}
export function Pagination({
  page,
  count,
  pageSize = 20,
  onChange,
}: {
  page: number;
  count: number;
  pageSize?: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return (
    <nav
      aria-label="Pagination"
      className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
    >
      <p className="text-sm text-muted-foreground">
        {count
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} of ${count}`
          : "0 records"}
      </p>
      <div className="flex items-center gap-2">
        <button className={adminButton} disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <span className="text-sm" aria-live="polite">
          {page} / {pages}
        </span>
        <button className={adminButton} disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </nav>
  );
}
export function DateFilters({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
}) {
  return (
    <>
      <label className="w-full min-w-0 text-xs font-bold sm:w-auto">
        From
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => onFrom(event.target.value)}
          onInput={(event) => onFrom(event.currentTarget.value)}
          className={`${adminInput} mt-1`}
        />
      </label>
      <label className="w-full min-w-0 text-xs font-bold sm:w-auto">
        Through
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => onTo(event.target.value)}
          onInput={(event) => onTo(event.currentTarget.value)}
          className={`${adminInput} mt-1`}
        />
      </label>
    </>
  );
}
