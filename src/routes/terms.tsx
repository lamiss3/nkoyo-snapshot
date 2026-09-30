import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { brand } from "@/config/brand";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms (draft) | Institutional Readiness Snapshot" },
      {
        name: "description",
        content: "Draft terms of use for the Institutional Readiness Snapshot, pending legal review.",
      },
      { property: "og:title", content: "Terms (draft)" },
      { property: "og:description", content: "Draft terms of use pending legal review." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <p className="rounded-2xl border-2 border-magenta/40 bg-blush p-4 text-sm font-semibold">
          {brand.legalReviewNotice}
        </p>
        <h1 className="mt-8 text-4xl font-black">Terms of Use</h1>

        <div className="mt-8 space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-extrabold text-foreground">What this tool is</h2>
            <p className="mt-2">
              The Snapshot is a draft reflection tool. It suggests topic priorities and shows a relative share across Culture, Capacity and Compliance. These are not validated scores or a verified assessment of your organization.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-extrabold text-foreground">Not legal advice</h2>
            <p className="mt-2">
              Nothing in this tool or its results is legal advice, and using it does not create an
              attorney-client relationship. Results do not confirm or deny compliance with any law,
              regulation or funder requirement.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-extrabold text-foreground">Your responsibility</h2>
            <p className="mt-2">
              Results reflect the answers you provide. Decisions you make based on them remain your
              organization's responsibility. Consult qualified counsel for legal questions.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-extrabold text-foreground">Contact</h2>
            <p className="mt-2">
              {brand.contactEmail ?? "[PLACEHOLDER — contact email not configured]"} •{" "}
              {brand.orgName}
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
