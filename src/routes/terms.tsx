import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalLink, type LegalSection } from "@/components/layout/LegalPage";
import { legal } from "@/config/legal";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use | Institutional Readiness Snapshot" },
      {
        name: "description",
        content:
          "Snapshot-specific terms for using Iban Ison Solutions LLC’s reflection tool, automated results and optional report emails.",
      },
      { property: "og:title", content: "Snapshot Terms of Use" },
      {
        property: "og:description",
        content:
          "Understand the Snapshot’s purpose, permitted use, limitations and connection to Iban Ison Solutions LLC’s company terms.",
      },
    ],
  }),
  component: TermsPage,
});

const sections: LegalSection[] = [
  {
    id: "operator-and-scope",
    title: "Operator and scope",
    content: (
      <>
        <p>
          The Institutional Readiness Snapshot is provided by {legal.operatorName}, based in{" "}
          {legal.location}. These Snapshot-specific terms explain use of this reflection tool, its
          on-screen results and any report or follow-up emails you request.
        </p>
        <p>
          Read these alongside our{" "}
          <LegalLink href={legal.companyTermsUrl}>company Terms and Conditions</LegalLink>, which
          set out the general legal terms for our services. A separately agreed engagement or
          service contract governs that engagement. Using the Snapshot or requesting a report does
          not create a consulting engagement or an attorney-client relationship.
        </p>
        <p>
          If you do not agree to the applicable terms, please do not use the Snapshot. Questions can
          be sent to{" "}
          <LegalLink href={`mailto:${legal.snapshotEmail}`}>{legal.snapshotEmail}</LegalLink>.
        </p>
      </>
    ),
  },
  {
    id: "purpose-and-limits",
    title: "Purpose and limits of the Snapshot",
    content: (
      <>
        <p>
          The Snapshot helps nonprofit leaders and boards reflect on Culture, Capacity and
          Compliance. It uses your answers to suggest possible priorities, relevant discussion
          questions and a practical starting point. Any relative three-C shares describe the
          assessment’s emphasis, not a grade, probability of a problem or verified measure of
          organizational health.
        </p>
        <p>
          The Snapshot, results and emails are educational and informational. They are not a
          verified audit, organizational diagnosis, legal opinion or certification of compliance.
          They do not replace professional judgment, governing documents, required approvals or
          advice from a qualified adviser who understands your circumstances.
        </p>
      </>
    ),
  },
  {
    id: "ai-and-accuracy",
    title: "AI-generated questions and content",
    content: (
      <>
        <p>
          The service uses application rules and AI services, including Jev for evidence evaluation
          and models accessed through OpenRouter or Google for generated questions and emails. AI
          content can be incomplete, inaccurate or unsuitable for a particular situation. Generated
          content is not necessarily personally reviewed by Nkoyo before it reaches you.
        </p>
        <p>
          Closest-match scenarios are hypothetical examples, not confirmation that those events
          occurred. A suggested connection between pressures is a question to explore, not proof of
          a cause. Check important statements and proposed actions with the people responsible
          before relying on them. Do not use the Snapshot as the sole basis for employment, funding,
          legal or other consequential decisions.
        </p>
      </>
    ),
  },
  {
    id: "responsible-use",
    title: "Your answers and responsible use",
    content: (
      <>
        <p>
          The Snapshot is intended for adult organizational professionals. Give answers that reflect
          your experience and share only information you are entitled to provide. You may skip the
          optional final written question. Avoid names and identifying details about beneficiaries,
          clients, colleagues and other people.
        </p>
        <p>
          Do not submit confidential case information, health records, passwords, account
          credentials or information that would breach a duty to someone else. Do not use the
          service unlawfully, send malicious content, bypass access controls, attempt to view
          another person’s records, or overload the service. Staff accounts are private; protect
          your sign-in information and use only the access your administrator authorizes.
        </p>
      </>
    ),
  },
  {
    id: "report-and-email",
    title: "Reports and optional email follow-ups",
    content: (
      <>
        <p>
          Your on-screen result is available without providing an email address. Requesting a
          detailed report authorizes us to use your saved assessment and email address to prepare
          and deliver that report. Four further personalized follow-ups are a separate, optional
          choice, planned for days 2, 4, 7 and 10 after the report.
        </p>
        <p>
          Email preparation and delivery depend on processing capacity, provider availability,
          subscription status and your mail service. Any delivery time shown is an estimate. A saved
          request or scheduled email is not a guarantee of inbox delivery; a message may be delayed
          or filtered as spam. Contact us if you need help with a requested report.
        </p>
        <p>
          You can unsubscribe from optional follow-ups using the link in those emails or by
          contacting us. Restarting the assessment or clearing browser storage does not cancel
          queued email, remove earlier records or withdraw email consent. The{" "}
          <Link to="/privacy" className="font-semibold text-navy underline underline-offset-4">
            Privacy Policy
          </Link>{" "}
          explains your data choices and how to request deletion.
        </p>
      </>
    ),
  },
  {
    id: "materials-and-submissions",
    title: "Materials and your submissions",
    content: (
      <>
        <p>
          We and our licensors retain the rights we hold in the site’s branding, design and original
          materials. You may save or print your Snapshot and use it for your organization’s internal
          discussion and planning. Do not resell the tool, copy the website as your own product, or
          imply that a result is a verified audit or endorsement by Iban Ison Solutions.
        </p>
        <p>
          You retain any rights you have in the information you submit. Providing answers allows us
          and the service providers described in the Privacy Policy to process them for the
          assessment, support, security and communications you request. This is not permission to
          publish your answers or add you to optional marketing without your choice.
        </p>
      </>
    ),
  },
  {
    id: "availability-and-rights",
    title: "Availability and applicable rights",
    content: (
      <>
        <p>
          The Snapshot is provided on an “as available” basis. We do not guarantee uninterrupted
          operation, error-free AI output or a particular organizational outcome. We may update or
          suspend features for maintenance, security or service changes. Save a copy of any result
          you want to keep.
        </p>
        <p>
          For governing law, dispute resolution, warranties and liability provisions, read the{" "}
          <LegalLink href={legal.companyTermsUrl}>company Terms and Conditions</LegalLink>. The
          company terms identify Georgia law and contain provisions that may affect how disputes are
          handled. Nothing on this page removes rights or protections that applicable law does not
          allow to be excluded.
        </p>
      </>
    ),
  },
  {
    id: "updates-and-contact",
    title: "Updates and contact",
    content: (
      <>
        <p>
          The date at the top identifies the latest update to these Snapshot-specific terms. Updates
          will be posted here, with any additional notice required by law. A change to these terms
          does not itself opt you into follow-up emails.
        </p>
        <p>
          For Snapshot support or a concern about these terms, email{" "}
          <LegalLink href={`mailto:${legal.snapshotEmail}`}>{legal.snapshotEmail}</LegalLink>. For
          general company matters, contact{" "}
          <LegalLink href={`mailto:${legal.companyEmail}`}>{legal.companyEmail}</LegalLink> or use
          the postal contact details in the company terms.
        </p>
      </>
    ),
  },
];

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      description={
        <p>
          What the Snapshot offers, how to use it responsibly and the limits of its results and
          emails.
        </p>
      }
      summary={[
        "The Snapshot offers a starting point for discussion, not a verified audit or legal advice.",
        "You are responsible for what you submit and for checking suggestions before acting on them.",
        "A requested report and optional follow-ups are separate choices; no consulting engagement is created.",
      ]}
      sections={sections}
    />
  );
}
