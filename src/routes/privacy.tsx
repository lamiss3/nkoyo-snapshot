import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy (draft) | Institutional Readiness Snapshot" },
      {
        name: "description",
        content:
          "Draft privacy information for the Institutional Readiness Snapshot, pending legal review.",
      },
      { property: "og:title", content: "Privacy (draft)" },
      { property: "og:description", content: "Draft privacy information pending legal review." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="rounded-2xl border-2 border-magenta/40 bg-blush p-4 text-sm font-semibold">
          {brand.legalReviewNotice}
        </p>
        <h1 className="mt-8 text-4xl font-black">Privacy</h1>

        <div className="mt-8 space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-extrabold text-foreground">What we collect</h2>
            <p className="mt-2">
              Your answers, written responses, and assessment decisions are saved in this browser so
              a refresh does not lose progress. When server logging is enabled, progress is also
              stored in the site's private database, including unfinished assessments, questions and
              answers, assessment steps, model inputs and outputs, errors, and results. Authorized
              Nkoyo administrators and staff can review these records to understand and improve the
              assessment. If you submit the detailed-report request, your email is linked to your
              completed assessment for follow-up. Answers are sent to Jev for topic evaluation and
              may be sent to Gemini for question wording. Please avoid names and confidential
              details.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-extrabold text-foreground">If you share your details</h2>
            <p className="mt-2">
              If you choose to request follow-up, we store the email address you provide and link it
              to your Snapshot. Marketing follow-up requires separate, explicit consent that is
              never pre-selected. You can use your results and the booking link without providing
              any details. If you request a detailed report, your saved answers and result are also
              sent to Gemini to prepare personalized email drafts. Staff can review these drafts and
              their source answers in the private Admin panel. The optional follow-up consists of
              four further emails about your Snapshot; declining it does not prevent requesting the
              report.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-extrabold text-foreground">Email</h2>
            <p className="mt-2">
              Kit is the configured email provider. When automatic delivery is enabled, your email
              address and personalized email content are sent to Kit to deliver the requested
              report. If you separately opt in, four follow-up emails are scheduled for days 2, 4, 7
              and 10 after the report. The follow-ups include an unsubscribe link. Earlier
              review-only requests are not automatically enrolled.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-extrabold text-foreground">Retention and contact</h2>
            <p className="mt-2">
              [PLACEHOLDER — a retention period must be set and confirmed with counsel before
              launch.] To ask about your data, contact{" "}
              {brand.contactEmail ?? "[PLACEHOLDER — contact email not configured]"}.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
