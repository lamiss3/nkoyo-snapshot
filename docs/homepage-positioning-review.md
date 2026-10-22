# Iban Ison homepage positioning review

Local implementation: 22 October 2026. Preview: http://127.0.0.1:5203/.

## Changes

- Centered, mission-focused hero with the supplied headline and supporting message.
- Two primary actions: Take the Free Snapshot and Book a Conversation. Neither requires completion of the other.
- Our Approach introduces practical strategy, governance and the Impact Triad™; its three cards explain Culture, Capacity and Compliance.
- Prominent Smart Snapshot section explains the three stages, on-screen findings, optional report, separate optional follow-ups and the distinction from professional assessment/advice.
- Equal Two Ways to Begin cards replace the service-catalog positioning. No service package cards are rendered and no service data was deleted.
- Founder section uses the official portrait and a biography grounded in official information.
- Two short, verbatim client testimonial excerpts retain their original attributions and source links.
- Insights & Resources groups published public articles and homepage-enabled videos, webinars and resources. Empty groups are hidden. Existing homepage opt-outs, public-content filtering and download/registration behavior remain in effect.
- Responsive navigation exposes the requested five destinations and booking CTA. Mobile supports expanded-state announcements, keyboard Escape and focus return. Legacy #how-it-works links remain valid.
- New homepage text, testimonials, pathways, image and section visibility are editable through Pages. Existing drafts and publications have not been rewritten.

## Sources checked

- https://ibanison.com/ — current testimonial wording/attributions and official portrait https://ibanison.com/wp-content/uploads/nkoyo.webp.
- https://ibanison.com/governance/ — founder's education, nonprofit, law and strategy background; Impact Triad context.
- https://ibanison.com/oha/ — official Book a Call destination: https://calendly.com/nkoyo/3cdiscoverycall.
- The Calendly destination loaded as **3C Discovery Call**, 30 minutes, hosted by Nkoyo Effiong Lewis. No appointment was booked. The separate speaking and accelerator calendars were excluded.

## Verification

- Existing CMS contract tests plus the homepage grouping regression: 10 passed.
- TypeScript, scoped ESLint and production build checked.
- Desktop rendered review; mobile at 390px and 320px; no horizontal overflow. Both pathway controls and final mobile CTAs remain usable.
- Mobile menu open/close, Escape/focus return, section anchors and CTA hrefs checked.
- Snapshot, resources, videos, privacy and terms destinations returned HTTP 200.
- Official portrait loaded successfully; image failure has a text-based fallback.
- Pages editor inspected using the existing signed-in administrator session. New section fields appear. Editor closed without saving; existing draft remains revision 1.

Screenshots: outputs/homepage-positioning-20261022/ under this task workspace (desktop hero/full, mobile hero/pathways/closing, CMS fields).

## Review and release notes

At the original local review, no deployment or content publication had been performed. Publication of this reviewed landing page and its imported blog article was subsequently authorized on 22 October 2026. No database migration is required. Authentication, assessment logic, AI configuration and email automations remain unchanged.

The existing full homepage draft retains its older copy, as requested. Before publishing that saved draft, review its fields against the new positioning; new fields use the reviewed defaults. With no published homepage, the app displays the new defaults after deployment. The preview currently shows only the populated Videos category; unpublished Kit articles and empty categories remain hidden.

The booking destination is the existing official 3C Discovery Call. Its Calendly description refers to discussing results; the homepage does not add an assessment prerequisite. Nkoyo can revise that calendar description or replace the editable booking URL if she wants a broader introductory call.
