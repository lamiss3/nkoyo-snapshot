import { useState } from "react";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import { brand } from "@/config/brand";
import { submitLead } from "@/lib/snapshot-api";

const schema = z.object({
  firstName: z.string().trim().min(1, "Please add your first name").max(80),
  email: z.string().trim().email("Please enter a valid work email").max(255),
  organization: z.string().trim().max(160).optional().or(z.literal("")),
  roleTitle: z.string().trim().max(80),
  challenge: z.string().trim().max(1000).optional().or(z.literal("")),
});

const roles = ["Executive Director/CEO", "Board Chair", "Other"];

export function LeadForm({ sessionKey }: { sessionKey: string | null }) {
  const [values, setValues] = useState({
    firstName: "",
    email: "",
    organization: "",
    roleTitle: roles[0]!,
    challenge: "",
  });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  const set = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0])] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setStatus("saving");
    try {
      await submitLead({
        sessionKey,
        firstName: parsed.data.firstName,
        email: parsed.data.email,
        organization: parsed.data.organization ?? "",
        roleTitle: parsed.data.roleTitle,
        challenge: parsed.data.challenge ?? "",
        marketingConsent: consent,
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div role="status" className="card-elevated p-8">
        <h3 className="text-xl font-extrabold">Request saved</h3>
        <p className="mt-3 text-muted-foreground">
          Your details are stored with your Snapshot.{" "}
          {brand.emailDeliveryConfigured
            ? "Your copy is on its way."
            : "Email delivery is not connected yet, so nothing has been emailed — the team will follow up manually until an email provider is configured."}
        </p>
      </div>
    );
  }

  const inputClass =
    "mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-magenta";

  return (
    <form onSubmit={onSubmit} className="card-elevated p-7 sm:p-9" noValidate>
      <h3 className="text-2xl font-black">Want a copy of your Snapshot and practical follow-up?</h3>
      <p className="mt-2 text-muted-foreground">
        Optional. Your results above are yours to keep either way.
      </p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="text-sm font-semibold">
            First name
          </label>
          <input
            id="firstName"
            value={values.firstName}
            onChange={set("firstName")}
            className={inputClass}
            aria-invalid={Boolean(errors['firstName'])}
            aria-describedby={errors['firstName'] ? "firstName-error" : undefined}
          />
          {errors['firstName'] && (
            <p id="firstName-error" className="mt-1 text-sm text-destructive">
              {errors['firstName']}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-semibold">
            Work email
          </label>
          <input
            id="email"
            type="email"
            value={values.email}
            onChange={set("email")}
            className={inputClass}
            aria-invalid={Boolean(errors['email'])}
            aria-describedby={errors['email'] ? "email-error" : undefined}
          />
          {errors['email'] && (
            <p id="email-error" className="mt-1 text-sm text-destructive">
              {errors['email']}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="organization" className="text-sm font-semibold">
            Organization
          </label>
          <input
            id="organization"
            value={values.organization}
            onChange={set("organization")}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="roleTitle" className="text-sm font-semibold">
            Role
          </label>
          <select
            id="roleTitle"
            value={values.roleTitle}
            onChange={set("roleTitle")}
            className={inputClass}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="challenge" className="text-sm font-semibold">
            Most pressing challenge (optional)
          </label>
          <textarea
            id="challenge"
            rows={3}
            value={values.challenge}
            onChange={set("challenge")}
            className={inputClass}
          />
        </div>
      </div>

      <label className="mt-6 flex items-start gap-3 rounded-2xl bg-blush p-4 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[oklch(0.65_0.266_335.4)]"
        />
        <span>
          Yes, {brand.orgName} may send me occasional follow-up emails about governance and
          institutional design. This is separate from receiving a copy of my Snapshot.
        </span>
      </label>

      {status === "error" && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          Something went wrong saving your details. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-navy px-8 font-bold text-navy-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {status === "saving" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Send me my Snapshot
      </button>

      {!brand.emailDeliveryConfigured && (
        <p className="mt-3 text-sm text-muted-foreground">
          Email delivery is not configured yet. Submissions are stored securely; no email is sent.
        </p>
      )}
    </form>
  );
}
