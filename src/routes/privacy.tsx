import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage, LegalLink, type LegalSection } from "@/components/layout/LegalPage";
import { legal } from "@/config/legal";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Institutional Readiness Snapshot" },
      {
        name: "description",
        content:
          "How Iban Ison Solutions LLC handles Snapshot answers, AI processing, email reports, retention and privacy requests.",
      },
      { property: "og:title", content: "Snapshot Privacy Policy" },
      {
        property: "og:description",
        content:
          "Understand how your Snapshot information is collected, used and shared, and the choices available to you.",
      },
    ],
  }),
  component: PrivacyPage,
});

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who is responsible",
    content: (
      <>
        <p>
          The Institutional Readiness Snapshot is operated by {legal.operatorName}, based in{" "}
          {legal.location}. In this notice, “we,” “us” and “our” refer to that company.
        </p>
        <p>
          This page explains the data practices of the Snapshot and its reports. It supplements our{" "}
          <LegalLink href={legal.companyPrivacyUrl}>company Privacy Policy</LegalLink>, which also
          covers our wider business. Features described there, such as purchases or social-media
          logins, are not part of the public Snapshot assessment.
        </p>
        <p>
          For Snapshot questions or privacy requests, email{" "}
          <LegalLink href={`mailto:${legal.snapshotEmail}`}>{legal.snapshotEmail}</LegalLink>. Our
          company privacy contact is{" "}
          <LegalLink href={`mailto:${legal.companyEmail}`}>{legal.companyEmail}</LegalLink>; postal
          contact details are available in the company policy.
        </p>
      </>
    ),
  },
  {
    id: "information-collected",
    title: "Information we collect",
    content: (
      <>
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <strong>Assessment information:</strong> your selections, optional written answers,
            displayed questions and scenario matches, assessment/session identifiers, progress,
            timestamps, suggested priorities and results.
          </li>
          <li>
            <strong>Processing records:</strong> assessment steps, requests and responses exchanged
            with AI services, generated question and email content, errors, processing times and
            available usage information. When server logging is enabled, these records can include
            unfinished assessments.
          </li>
          <li>
            <strong>Contact and email information:</strong> an email address if you request a
            report, its link to your assessment, your follow-up choice and consent time, preparation
            and delivery status, and communications you send us.
          </li>
          <li>
            <strong>Technical information:</strong> site activity and diagnostic records. Our
            hosting and other service providers also process connection information such as IP
            addresses and browser details to operate their services.
          </li>
          <li>
            <strong>Staff access:</strong> staff email addresses, account roles and authentication
            information are handled through our private staff system and Supabase Auth. Taking the
            public assessment does not require a staff account.
          </li>
        </ul>
        <p>
          Please describe organizational situations without identifying clients, beneficiaries,
          employees or other people. Do not enter passwords, financial account details, health
          information, confidential case details or information you are not authorized to share.
          Anything you write may enter the processing records described above.
        </p>
      </>
    ),
  },
  {
    id: "uses-and-processing",
    title: "How we use information",
    content: (
      <>
        <p>
          We use your information to run and save the assessment, choose relevant follow-up
          questions, identify possible priorities, display results, prepare a report you request,
          provide support and investigate errors. Authorized administrators and staff can review
          answers, model records, results and email drafts to support users and improve the
          assessment.
        </p>
        <p>
          Jev evaluates evidence in your answers. Application rules select topics and calculate the
          result. AI models can write scenario questions and personalized report emails. Scenario
          selections describe a closest match, not a verified event. These processes produce
          suggestions for organizational reflection; they are not decisions about a person’s
          employment, funding eligibility or legal rights.
        </p>
        <p>
          Where applicable law requires a legal basis, processing to supply the assessment or a
          requested report supports providing the service you ask for; operation, support and
          security support our legitimate business interests where permitted; optional promotional
          follow-ups rely on your consent. Legal obligations may also require us to keep or disclose
          particular records.
        </p>
      </>
    ),
  },
  {
    id: "service-providers",
    title: "Who processes the information",
    content: (
      <>
        <p>
          We use service providers to deliver the Snapshot. Relevant information is shared with:
        </p>
        <ul className="list-disc space-y-3 pl-5">
          <li>
            <strong>Vercel</strong> for hosting and technical operations, and{" "}
            <strong>Supabase</strong> for database storage and staff authentication.
          </li>
          <li>
            <strong>Jev, provided by TypeSafe AI,</strong> for assessment evaluation.
          </li>
          <li>
            <strong>
              OpenRouter and the model providers it routes to, including Google Gemini and Anthropic
              Claude,
            </strong>{" "}
            for generated questions and report writing. Some configurations use Google’s API
            directly. Questions, answers and results needed for those tasks are transmitted;
            identifying details typed into an answer can be included.
          </li>
          <li>
            <strong>Kit</strong> for report delivery and separately requested follow-ups. Kit
            receives the recipient email, personalized email content and information needed to
            manage delivery and subscription preferences. Delivery, open and click information may
            be processed depending on the email provider’s settings.
          </li>
          <li>
            <strong>Google Fonts</strong> to display the site’s typeface; your browser connects to
            Google to load those files.
          </li>
        </ul>
        <p>
          Provider retention and processing depend on the service, account settings and applicable
          agreements. We do not promise that every provider offers zero retention or uses the same
          model-training policy. Please avoid submitting sensitive information.
        </p>
        <p>
          Provider information:{" "}
          <LegalLink href="https://vercel.com/legal/privacy-notice">Vercel</LegalLink>,{" "}
          <LegalLink href="https://supabase.com/privacy">Supabase</LegalLink>,{" "}
          <LegalLink href="https://typesafe.ai/legal/privacy-policy">TypeSafe AI</LegalLink>,{" "}
          <LegalLink href="https://openrouter.ai/privacy">OpenRouter</LegalLink>, and{" "}
          <LegalLink href="https://kit.com/privacy">Kit</LegalLink>. Routed providers’ practices are
          also described through OpenRouter’s provider information.
        </p>
        <p>
          We do not publish your assessment answers or use this app to provide them to advertisers.
          We may disclose information when required by law, to address misuse or protect rights and
          security, or in a business transfer as described in our company Privacy Policy.
          Information may be processed in the United States and other countries where providers
          operate; those countries’ laws may differ from yours. Contact us about safeguards
          applicable to your information.
        </p>
      </>
    ),
  },
  {
    id: "email-choices",
    title: "Reports and optional follow-ups",
    content: (
      <>
        <p>
          You can view your on-screen result without sharing an email address. If you request a
          report, we link your address to the completed assessment and use your answers and result
          to prepare the requested email.
        </p>
        <p>
          The separate follow-up checkbox is optional and is not pre-selected. Choosing it requests
          four further personalized emails, planned for days 2, 4, 7 and 10 after the report.
          Declining follow-ups does not prevent requesting the report. Preparation and delivery
          depend on provider availability and subscription status; submitting an address is not
          confirmation that an email has arrived.
        </p>
        <p>
          Use the unsubscribe link in a follow-up email, or contact us, to withdraw your follow-up
          consent. This does not undo earlier processing or automatically delete assessment records.
          Essential messages responding to a request or a privacy inquiry may still be sent.
        </p>
      </>
    ),
  },
  {
    id: "browser-storage",
    title: "Browser storage and site activity",
    content: (
      <>
        <p>
          The app uses browser local storage to keep assessment progress and report-request status.
          Staff authentication also uses browser storage when staff sign in. Assessment drafts do
          not have an automatic local expiry; they remain until replaced, removed by the app or
          cleared through your browser settings.
        </p>
        <p>
          Clearing this site’s browser data may remove your saved progress or sign-in state.
          Restarting the assessment or clearing browser storage does not delete information already
          stored on our server, cancel a queued report or unsubscribe an email address.
        </p>
        <p>
          The Snapshot records service activity and errors; it does not include a public
          advertising-pixel or retargeting integration. Our company website and third-party services
          have their own cookie and tracking practices. Browser settings can control local storage
          and cookies, but blocking them may affect progress saving or staff sign-in.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep records",
    content: (
      <>
        <p>
          We keep assessment records, linked emails and processing logs only as needed to prepare
          and support requested reports, handle support or privacy requests, investigate errors and
          protect the service. We review these records manually and delete or anonymize information
          when those purposes no longer require it.
        </p>
        <p>
          Retention decisions consider whether report preparation or follow-up is still active,
          whether an unresolved support or security issue needs the record, whether we must
          demonstrate an email preference, and whether law requires preservation. A minimal
          suppression record may be kept to respect an unsubscribe request. There is no automatic
          deletion schedule or fixed expiry in the app.
        </p>
        <p>
          Deletion may not immediately remove copies held in backups or records a provider must keep
          for legal or security purposes. Provider retention terms apply to those copies. You can
          contact us to request deletion of your assessment and linked contact information; we will
          explain any lawful reason we need to retain part of it.
        </p>
      </>
    ),
  },
  {
    id: "privacy-requests",
    title: "Your choices and privacy requests",
    content: (
      <>
        <p>
          You may ask what information we hold about you, request a copy or correction, request
          deletion, or ask us to stop optional follow-ups. Depending on applicable law, you may also
          have rights to restrict or object to processing, receive portable data, appeal a decision
          on a request or complain to a relevant privacy regulator.
        </p>
        <p>
          <strong>To make a request:</strong> email{" "}
          <LegalLink href={`mailto:${legal.snapshotEmail}?subject=Snapshot%20privacy%20request`}>
            {legal.snapshotEmail}
          </LegalLink>{" "}
          or use our existing{" "}
          <LegalLink href={legal.privacyRequestUrl}>company privacy-request form</LegalLink>. Tell
          us what you need and include your assessment ID if you have it. Do not send passwords or
          private access tokens. We may ask for proportionate information to verify a data request
          and will respond as required by applicable law.
        </p>
        <p>
          <strong>To object to optional marketing:</strong> unsubscribe in the email or tell us
          directly. You do not need to complete the assessment or explain your reason to withdraw
          that choice.
        </p>
      </>
    ),
  },
  {
    id: "security-and-children",
    title: "Security and intended users",
    content: (
      <>
        <p>
          Private assessment and email records are restricted to authorized staff and service
          operations through access controls. No internet service or storage system can be
          guaranteed completely secure. Please use a trusted device and protect any saved report or
          session information.
        </p>
        <p>
          The Snapshot is intended for adult nonprofit leaders, board members and organizational
          professionals. It is not directed to children under 18. If you believe a child’s personal
          information has been submitted, contact us so we can investigate and take appropriate
          steps.
        </p>
      </>
    ),
  },
  {
    id: "policy-updates",
    title: "Updates and contact",
    content: (
      <>
        <p>
          We will update the date on this page when the notice changes. If a change materially
          affects the handling of information already collected, we will provide any additional
          notice or choice required by law. We will not treat a policy update as permission to add
          you to optional follow-up emails.
        </p>
        <p>
          Contact {legal.operatorName} in {legal.location} at{" "}
          <LegalLink href={`mailto:${legal.snapshotEmail}`}>{legal.snapshotEmail}</LegalLink>. For
          the wider business, see the{" "}
          <LegalLink href={legal.companyPrivacyUrl}>company Privacy Policy</LegalLink>. You can also
          read the Snapshot{" "}
          <Link to="/terms" className="font-semibold text-navy underline underline-offset-4">
            Terms of Use
          </Link>
          .
        </p>
      </>
    ),
  },
];

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description={
        <p>
          How your Snapshot answers, report request and email preferences are handled—and the
          choices you have.
        </p>
      }
      summary={[
        "Your answers can be saved while the assessment is unfinished and reviewed by authorized staff.",
        "AI services process relevant questions and answers to evaluate topics and write questions or reports.",
        "An emailed report is your choice. Four further emails require a separate opt-in.",
      ]}
      sections={sections}
    />
  );
}
