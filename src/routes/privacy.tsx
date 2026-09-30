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
        content: "Draft privacy information for the Institutional Readiness Snapshot, pending legal review.",
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
              Your answers, written responses, and assessment decisions are saved in this browser so a refresh does not lose progress. If you submit the detailed-report request, your email and completed assessment are also saved together in the site's database for follow-up. Answers are sent to Jev for topic evaluation and may be sent to Gemini for question wording. Please avoid names and confidential details.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-extrabold text-foreground">If you share your details</h2>
            <p className="mt-2">
              If you choose to request follow-up, we store the email address you provide and link it to your Snapshot. Marketing follow-up requires
              separate, explicit consent that is never pre-selected. You can use your results and the
              booking link without providing any details.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-extrabold text-foreground">Email</h2>
            <p className="mt-2">
              {brand.emailDeliveryConfigured
                ? "Email is delivered through our configured provider."
                : "An email provider is not connected yet. No automated emails are sent from this tool today."}
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
