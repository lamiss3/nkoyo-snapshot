/**
 * Editable brand + integration configuration.
 * Nkoyo (or her team) can change everything in this file without touching UI code.
 */

export const brand = {
  orgName: "Iban Ison Solutions",
  productName: "Institutional Readiness Snapshot",
  personName: "Nkoyo Effiong Lewis",
  tagline: "Design what's next.",

  /**
   * Logo asset. Leave `imageUrl` as null to render the built-in wordmark.
   * To use a real logo file, add it to src/assets and set imageUrl to the import.
   */
  logo: {
    imageUrl: null as string | null,
    wordmark: "Iban Ison",
    wordmarkSub: "Solutions",
  },

  /**
   * Replaceable portrait area. Set imageUrl to a real photo of Nkoyo when available.
   * Until then a branded placeholder frame is shown (no stock photography).
   */
  portrait: {
    imageUrl: null as string | null,
    alt: "Portrait of Nkoyo Effiong Lewis",
    initials: "NEL",
  },

  /**
   * NOT CONFIGURED: replace with the real scheduling link before launch.
   * While this is null the booking button explains that scheduling is not yet connected.
   */
  bookingUrl: null as string | null,

  /** NOT CONFIGURED: replace with real contact + social links. */
  contactEmail: null as string | null,
  social: {
    instagram: null as string | null,
    linkedin: null as string | null,
    youtube: null as string | null,
  },

  /**
   * Email delivery is not connected in this MVP. When false, the app never
   * claims an email was sent — it only stores the request.
   */
  emailDeliveryConfigured: false,

  legalReviewNotice:
    "DRAFT — this text is a placeholder prepared for human legal review. It is not legal advice and must be reviewed and approved before launch.",
} as const;

export const bookingCopy = {
  cta: "Book Your Governance Review",
  supporting:
    "Explore what your answers reveal, identify the decisions that matter now, and discuss practical next steps with Nkoyo.",
};
