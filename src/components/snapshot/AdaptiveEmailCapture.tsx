import { Link } from "@tanstack/react-router";
import { Loader2, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";

import type { AssessmentSession } from "@/assessment-v2/types";
import { brand } from "@/config/brand";
import { submitAdaptiveReportRequest } from "@/lib/snapshot-api";

const emailSchema = z.string().trim().email("Enter a valid email address.").max(255);

export function AdaptiveEmailCapture({ session }: { session: AssessmentSession }) {
  const [email, setEmail] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");
  const savedKey = `nkoyo-adaptive-report-request:${session.id}`;

  useEffect(() => {
    try { if (window.localStorage.getItem(savedKey) === "saved") setStatus("saved"); }
    catch { /* the form still works when local storage is unavailable */ }
  }, [savedKey]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "saving") return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Enter a valid email address."); return; }
    setMessage("");
    setStatus("saving");
    try {
      await submitAdaptiveReportRequest({ session, email: parsed.data.toLowerCase(), marketingConsent });
      try { window.localStorage.setItem(savedKey, "saved"); } catch { /* optional */ }
      setStatus("saved");
    } catch {
      setMessage("We could not save your request. Please try again.");
      setStatus("error");
    }
  };

  if (status === "saved") return <section className="no-print mt-8 card-elevated p-8" role="status">
    <h2 className="text-2xl font-black">Your request is saved</h2>
    <p className="mt-3 text-muted-foreground">Your email and Snapshot are linked for follow-up. Email delivery is not connected yet, so no report has been sent.</p>
  </section>;

  return <section className="no-print mt-8 card-elevated p-8 sm:p-10" aria-labelledby="report-request-title">
    <div className="flex items-center gap-3"><Mail className="h-6 w-6 text-magenta" aria-hidden="true" /><h2 id="report-request-title" className="text-2xl font-black">Request a more detailed report</h2></div>
    <p className="mt-3 max-w-2xl text-muted-foreground">Leave your email and we’ll save it with your completed Snapshot for follow-up. Automated email delivery is being set up; this form does not send a report yet. Your results above remain available without sharing an email.</p>

    <form onSubmit={submit} noValidate className="mt-6">
      <label htmlFor="adaptive-report-email" className="text-sm font-semibold">Email address</label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input id="adaptive-report-email" name="email" type="email" autoComplete="email" required maxLength={255} value={email} onChange={(event) => { setEmail(event.target.value); if (message) setMessage(""); }} aria-invalid={Boolean(message && status !== "error")} aria-describedby={message ? "adaptive-report-error" : undefined} className="min-h-12 w-full min-w-0 rounded-xl border border-input bg-card px-4 text-base outline-none focus:border-magenta" placeholder="you@organization.org" />
        <button type="submit" disabled={status === "saving"} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-navy px-7 font-bold text-navy-foreground hover:bg-navy/90 disabled:opacity-60">{status === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save my request</button>
      </div>
      {message && <p id="adaptive-report-error" role="alert" className="mt-2 text-sm text-destructive">{message}</p>}

      <label className="mt-5 flex items-start gap-3 text-sm leading-relaxed">
        <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[oklch(0.65_0.266_335.4)]" />
        <span>Yes, {brand.orgName} may send me occasional governance updates. This is optional and separate from my report request.</span>
      </label>
      <p className="mt-4 text-xs text-muted-foreground">Your email and written answers will be stored together. Read our <Link to="/privacy" className="underline underline-offset-2">privacy information</Link>.</p>
    </form>
  </section>;
}
