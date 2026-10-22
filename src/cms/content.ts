import { z } from "zod";

export const kinds = ["page", "blog", "video", "webinar", "resource", "popup"] as const;
export type ContentKind = (typeof kinds)[number];
export type LinkValue = { label: string; href: string };
export type ContentValue = string | number | boolean | string[] | LinkValue[];
export type Content = Record<string, ContentValue>;
export interface Field {
  key: string;
  label: string;
  group: string;
  type?: "text" | "textarea" | "url" | "toggle" | "number" | "select" | "links" | "list" | "pdf";
  max?: number;
  required?: boolean;
  options?: string[];
  help?: string;
  default?: ContentValue;
}
export type ContentDocument = {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  draft: Content;
  published: Content | null;
  revision: number;
  published_revision: number;
  archived: boolean;
  source_ref: string | null;
  updated_at: string;
  published_at: string | null;
  updated_by: string | null;
};
export type ContentVersion = {
  id: string;
  document_id: string;
  revision: number;
  title: string;
  slug: string;
  content: Content;
  action: string;
  created_at: string;
};
export const HOME_ID = "00000000-0000-4000-8000-000000000001";
export const text = (value: Content | null | undefined, key: string) =>
  typeof value?.[key] === "string" ? (value[key] as string) : "";
export const flag = (value: Content | null | undefined, key: string) => value?.[key] === true;
export const order = (value: Content | null | undefined) =>
  typeof value?.["order"] === "number" ? (value["order"] as number) : 0;
export const links = (value: Content | null | undefined, key: string): LinkValue[] =>
  Array.isArray(value?.[key]) ? (value[key] as LinkValue[]) : [];
export const lines = (value: Content | null | undefined, key: string): string[] =>
  Array.isArray(value?.[key]) ? (value[key] as string[]) : [];

export function safeHref(value: string, externalOnly = false): boolean {
  if (
    !value ||
    value.length > 2048 ||
    [...value].some((char) => char.charCodeAt(0) <= 32 || char === "\\")
  )
    return false;
  if (!externalOnly && value.startsWith("/") && !value.startsWith("//")) {
    try {
      const path = decodeURIComponent(value.split(/[?#]/)[0]!);
      return /^(\/(?:snapshot|insights|videos|webinars(?:\/[a-z0-9-]+)?|resources(?:\/[a-z0-9-]+)?|privacy|terms)?)$/.test(
        path,
      );
    } catch {
      return false;
    }
  }
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      host.includes(".") &&
      !host.endsWith(".local") &&
      !host.endsWith(".internal") &&
      !host.endsWith(".localhost") &&
      host !== "localhost" &&
      !/^[\d.]+$/.test(host) &&
      !host.includes(":")
    );
  } catch {
    return false;
  }
}
export function youtubeId(value: string): string | null {
  try {
    const url = new URL(value);
    if (!safeHref(value, true)) return null;
    let id: string | null = null;
    if (url.hostname === "youtu.be") id = url.pathname.split("/")[1] ?? null;
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(url.hostname)
    ) {
      id =
        url.pathname === "/watch"
          ? url.searchParams.get("v")
          : /^\/(shorts|embed)\//.test(url.pathname)
            ? (url.pathname.split("/")[2] ?? null)
            : null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

const f = (
  key: string,
  label: string,
  group: string,
  options: Omit<Field, "key" | "label" | "group"> = {},
): Field => ({ key, label, group, ...options });
const common = [
  f("title", "Title", "Content", { required: true, max: 160 }),
  f("description", "Short description", "Content", { type: "textarea", max: 500, required: true }),
  f("category", "Display category", "Content", { max: 80 }),
  f("coverUrl", "Cover image URL", "Content", {
    type: "url",
    help: "Approved HTTPS image only. Leave blank until an approved asset is available.",
  }),
  f("featured", "Featured", "Promotion", { type: "toggle" }),
  f("homepage", "Show on homepage", "Promotion", { type: "toggle" }),
  f("order", "Display order", "Promotion", { type: "number", default: 0 }),
];
const seo = [
  f("seoTitle", "SEO title", "Search", { max: 70 }),
  f("seoDescription", "SEO description", "Search", { type: "textarea", max: 180 }),
];
const registration = [
  f("formId", "Kit delivery form ID", "Kit delivery", {
    help: "Use a dedicated Kit form whose incentive email delivers this item. The server checks that this form exists.",
  }),
  f("formUrl", "Kit hosted registration URL", "Kit delivery", {
    type: "url",
    help: "Must exactly match the form’s embed_url returned by Kit.",
  }),
  f(
    "workflowConfirmed",
    "I tested this form’s confirmation and recording/file delivery in Kit",
    "Kit delivery",
    {
      type: "toggle",
      help: "The API cannot inspect your incentive email. This acknowledgment is required before publication. Do not add unrelated marketing to this delivery-only form.",
    },
  ),
  f("confirmation", "Registration instructions / confirmation message", "Kit delivery", {
    type: "textarea",
    max: 500,
    default: "Complete the Kit form and check your email for confirmation and access instructions.",
  }),
  f("thankYouUrl", "Configured Kit thank-you page URL", "Kit delivery", {
    type: "url",
    help: "Configure the same destination inside Kit; this field documents that setup.",
  }),
  f("followupFormId", "Optional nurture form ID", "Optional marketing", {
    help: "A separate form, separate choice. Leave blank for delivery only.",
  }),
  f("followupFormUrl", "Optional nurture signup URL", "Optional marketing", { type: "url" }),
  f("followupLabel", "Optional nurture invitation", "Optional marketing", {
    max: 160,
    default: "Optional: request further guidance by email",
  }),
  f("tagId", "Webinar/resource tag ID (configured in Kit)", "Kit delivery"),
  f("sequenceId", "Delivery sequence ID (configured in Kit)", "Kit delivery", {
    help: "Documentation only. Configure form rules and sequences in Kit; the CMS never enrolls subscribers itself.",
  }),
  f(
    "nurtureSequenceId",
    "Optional five-day nurture sequence ID (configured in Kit)",
    "Optional marketing",
    { help: "Configure the separate optional form’s automation in Kit." },
  ),
  f(
    "nurtureWorkflowConfirmed",
    "I tested the separate five-day nurture signup and unsubscribe",
    "Optional marketing",
    {
      type: "toggle",
      help: "Required only when offering the optional follow-up form. Confirm its sequence and consent copy inside Kit.",
    },
  ),
];

export const homeFields: Field[] = [
  f("ogTitle", "Social sharing title", "Search", {
    max: 100,
    default: "Institutional Readiness Snapshot",
  }),
  f("ogDescription", "Social sharing description", "Search", {
    type: "textarea",
    max: 240,
    default:
      "A clearer view of organizational pressures, with possible priorities and useful questions for your team or board.",
  }),
  f("seoTitle", "SEO title", "Search", {
    max: 70,
    required: true,
    default: "Institutional Readiness Snapshot | Iban Ison Solutions",
  }),
  f("seoDescription", "SEO description", "Search", {
    type: "textarea",
    max: 180,
    required: true,
    default:
      "A reflection for nonprofit leaders and boards. Explore pressures across Culture, Capacity and Compliance, with possible priorities and a starting point for discussion.",
  }),
  f("heroEyebrow", "Hero eyebrow", "Hero", {
    default: "Institutional Readiness Snapshot",
    max: 80,
  }),
  f("audience", "Audience", "Hero", { default: "For nonprofit leaders and boards", max: 160 }),
  f("heroTitle", "Hero headline", "Hero", {
    required: true,
    max: 120,
    default: "What’s making leadership",
  }),
  f("heroHighlight", "Highlighted headline", "Hero", {
    max: 120,
    default: "harder than it needs to be?",
  }),
  f("heroDescription", "Hero supporting description", "Hero", {
    type: "textarea",
    required: true,
    max: 500,
    default:
      "Get a clearer view of the pressures across your organization’s Culture, Capacity and Compliance, with possible priorities and a useful starting point for discussion.",
  }),
  f("ctaLabel", "Primary CTA label", "Calls to action", {
    required: true,
    max: 60,
    default: "Start the Snapshot",
  }),
  f("ctaHref", "Primary CTA destination", "Calls to action", {
    type: "url",
    required: true,
    default: "/snapshot",
  }),
  f("heroNote", "Supporting CTA note", "Hero", {
    type: "textarea",
    max: 240,
    default: "Relevant follow-up questions.\nYour Snapshot results on screen.",
  }),
  f("secondaryLabel", "Secondary CTA label", "Calls to action", { max: 60 }),
  f("secondaryHref", "Secondary CTA destination", "Calls to action", { type: "url" }),
  f("howVisible", "Show how it works", "How it works", { type: "toggle", default: true }),
  f("howTitle", "How it works heading", "How it works", {
    max: 160,
    default: "Make the next conversation clearer.",
  }),
  f("howBody", "How it works explanation", "How it works", {
    type: "textarea",
    max: 800,
    default:
      "Reflect on current pressures, answer follow-up questions relevant to your answers, then explore possible priorities and next steps.",
  }),
  f("howNote", "Reflection note", "How it works", {
    max: 240,
    default: "A reflection, not a graded test. Your answers are a starting point for discussion.",
  }),
  ...[0, 1, 2].flatMap((n) => [
    f(`benefit${n}Label`, `Card ${n + 1} label`, "Benefit cards", {
      max: 60,
      default: ["Your focus", "Your next conversation", "Your optional report"][n]!,
    }),
    f(`benefit${n}Title`, `Card ${n + 1} takeaway`, "Benefit cards", {
      max: 120,
      default: [
        "See possible priorities",
        "Bring a useful starting point",
        "Explore your answers further",
      ][n]!,
    }),
    f(`benefit${n}Body`, `Card ${n + 1} explanation`, "Benefit cards", {
      type: "textarea",
      max: 500,
      default: [
        "See which pressures your answers suggest are worth a closer look, across Culture, Capacity and Compliance.",
        "Take discussion prompts and a practical first step to your team or board, grounded in what you shared.",
        "Request a personalized email report that explains your findings in more detail, with examples and useful next steps.",
      ][n]!,
    }),
  ]),
  f("emailTitle", "Report choice heading", "Report explanation", {
    max: 160,
    default: "On screen first. Email only if you choose.",
  }),
  f("emailBody", "Report and optional follow-up explanation", "Report explanation", {
    type: "textarea",
    max: 700,
    default:
      "View your results without sharing an email. Afterward, you can request a more detailed report. Four personalized follow-up emails are a separate, optional choice; you can unsubscribe at any time.",
  }),
  f("dimensionsVisible", "Show the three dimensions", "Three dimensions", {
    type: "toggle",
    default: true,
  }),
  f("dimensionsTitle", "Dimensions heading", "Three dimensions", {
    max: 180,
    default: "Three lenses on the pressures behind the work.",
  }),
  f("dimensionsBody", "Dimensions introduction", "Three dimensions", {
    type: "textarea",
    max: 500,
    default:
      "Some pressures span more than one area. Use the connections as questions to explore with your team.",
  }),
  ...[0, 1, 2].flatMap((n) => [
    f(
      `dimension${n}Blurb`,
      `${["Culture", "Capacity", "Compliance"][n]} summary`,
      "Three dimensions",
      {
        max: 160,
        default: [
          "How decisions and responsibilities work.",
          "How people and resources carry the work.",
          "How responsibilities and safeguards work in practice.",
        ][n]!,
      },
    ),
    f(
      `dimension${n}Detail`,
      `${["Culture", "Capacity", "Compliance"][n]} detail`,
      "Three dimensions",
      {
        type: "textarea",
        max: 600,
        default: [
          "Decision authority, board–staff boundaries, shared priorities and how stated values guide everyday choices.",
          "Workload, funding, continuity and access to the knowledge and tools needed to deliver current commitments.",
          "Ownership of requirements, reporting, partnership rules and the checks that support responsible decisions.",
        ][n]!,
      },
    ),
  ]),
  f("aboutVisible", "Show About Nkoyo", "About", { type: "toggle", default: true }),
  f("aboutTitle", "About heading", "About", { max: 160, default: "Nkoyo Effiong Lewis" }),
  f("aboutBody", "About copy", "About", {
    type: "textarea",
    max: 2000,
    default:
      "Nkoyo Effiong Lewis is the founder of Iban Ison Solutions. She has a background in nonprofit law, governance and organizational strategy, and works with mission-driven leaders to strengthen culture, capacity and compliance.",
  }),
  f("portraitUrl", "Approved portrait URL", "About", { type: "url" }),
  f("portraitAlt", "Portrait description", "About", {
    max: 180,
    default: "Portrait of Nkoyo Effiong Lewis",
  }),
  f("bookingHref", "Booking destination", "Calls to action", { type: "url" }),
  f("bookingLabel", "Booking label", "Calls to action", {
    max: 80,
    default: "Book Your Governance Review",
  }),
  f("bookingBody", "Booking explanation", "Calls to action", {
    type: "textarea",
    max: 500,
    default:
      "Explore what your answers reveal, identify the decisions that matter now, and discuss practical next steps with Nkoyo.",
  }),
  f("closingVisible", "Show closing Snapshot CTA", "Closing CTA", {
    type: "toggle",
    default: true,
  }),
  f("closingTitle", "Closing heading", "Closing CTA", {
    max: 180,
    default: "Give your next conversation a starting point.",
  }),
  f("closingBody", "Closing explanation", "Closing CTA", {
    type: "textarea",
    max: 600,
    default:
      "Bring the pressures you’re noticing. Leave with questions and a practical first step to explore with your team or board.",
  }),
  f("featuredVisible", "Show explicitly featured library items", "Featured libraries", {
    type: "toggle",
    help: "Appears only after genuine library items are published and selected. Up to four resources, three videos/articles and one featured webinar.",
  }),
  f("navigationLinks", "Header navigation", "Navigation and footer", {
    type: "links",
    default: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "About Nkoyo", href: "/#about" },
    ],
  }),
  f("footerLinks", "Snapshot footer links", "Navigation and footer", {
    type: "links",
    default: [
      { label: "Start the Snapshot", href: "/snapshot" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "About Nkoyo", href: "/#about" },
    ],
  }),
  f("contactEmail", "Footer contact email", "Navigation and footer", {
    max: 255,
    default: "hello@nkoyoeffionglewis.com",
  }),
  f("analyticsEnabled", "Offer optional content interaction measurement", "Privacy", {
    type: "toggle",
    help: "Off by default. Counts are sent only after a visitor opts in and when DNT/GPC are off. No assessment information is included.",
  }),
];

export const contentFields: Record<ContentKind, Field[]> = {
  page: homeFields,
  blog: [
    f("featured", "Featured article", "Display", { type: "toggle" }),
    f("visible", "Visible on website", "Display", { type: "toggle", default: true }),
    f("order", "Featured order", "Display", { type: "number" }),
    f("category", "Local display category", "Display", { max: 80 }),
  ],
  video: [
    ...common,
    f("youtubeUrl", "YouTube URL", "Video", {
      type: "url",
      required: true,
      help: "Watch, youtu.be share, Shorts or embed URL. No iframe code.",
    }),
    f("relatedResourceHref", "Related resource page", "Video", { type: "url" }),
  ],
  webinar: [
    ...common,
    f("longDescription", "Full description", "Content", { type: "textarea", max: 8000 }),
    f("audience", "Intended audience", "Content", { max: 300 }),
    f("outcomes", "Key learning outcomes", "Content", { type: "list" }),
    f("presenter", "Presenter information", "Content", { type: "textarea", max: 1500 }),
    f("ctaLabel", "Registration button label", "Content", {
      max: 80,
      default: "Register for the recording",
    }),
    f("recordingProvider", "Recording provider", "Private recording", {
      type: "select",
      options: ["youtube", "vimeo", "external"],
      default: "youtube",
    }),
    f("recordingUrl", "Private recording URL", "Private recording", {
      type: "url",
      required: true,
      help: "Never sent to the public frontend. Configure its delivery inside Kit. An unlisted recording is not identity-based access control.",
    }),
    f("deliveryUrl", "Private delivery page/link", "Private recording", { type: "url" }),
    f("accessInstructions", "Private access instructions", "Private recording", {
      type: "textarea",
      max: 2000,
    }),
    f("inResources", "Include in Resources", "Promotion", { type: "toggle" }),
    f("popupEligible", "Available for popup promotion", "Promotion", { type: "toggle" }),
    ...registration,
    ...seo,
  ],
  resource: [
    ...common,
    f("resourceType", "Resource type", "Content", {
      type: "select",
      options: ["guide", "checklist", "worksheet", "other"],
      default: "guide",
    }),
    f("longDescription", "Detailed description", "Content", { type: "textarea", max: 8000 }),
    f("audience", "Target audience", "Content", { max: 300 }),
    f("benefit", "Main benefit", "Content", { type: "textarea", max: 800 }),
    f("benefits", "Key benefits", "Content", { type: "list" }),
    f("ctaLabel", "Access button label", "Content", { max: 80, default: "Get the resource" }),
    f("access", "Access type", "Access", {
      type: "select",
      options: ["open", "registration"],
      default: "open",
    }),
    f("assetId", "Approved PDF", "Access", {
      type: "pdf",
      help: "PDF only, maximum 10 MB. Files remain in private persistent storage; registration-based files must be delivered using your Kit incentive email.",
    }),
    f("externalUrl", "File or external delivery URL", "Access", {
      type: "url",
      help: "For registration access this is private documentation, not a public download link.",
    }),
    ...registration,
    ...seo,
  ],
  popup: [
    f("title", "Internal campaign name", "Content", { required: true, max: 160 }),
    f("headline", "Public headline", "Content", { required: true, max: 160 }),
    f("description", "Supporting message", "Content", { type: "textarea", max: 600 }),
    f("ctaLabel", "CTA text", "Content", { required: true, max: 80 }),
    f("ctaHref", "CTA destination", "Content", { type: "url", required: true }),
    f("imageUrl", "Optional image URL", "Content", { type: "url" }),
    f("promotionId", "Related published resource/webinar ID (optional)", "Content", {
      help: "If supplied, the item must be published; a webinar must allow popup promotion.",
    }),
    f("mode", "Campaign type", "Display", {
      type: "select",
      options: ["modal", "bar"],
      default: "modal",
    }),
    f("eligiblePages", "Eligible marketing paths", "Display", {
      type: "list",
      default: ["/"],
      help: "Only /, /insights, /videos, /webinars and /resources. Never assessment, result, auth, report or admin routes.",
    }),
    f("delay", "Show after", "Display", {
      type: "select",
      options: ["0", "5", "15", "30"],
      default: "5",
    }),
    f("frequency", "Frequency cap", "Display", {
      type: "select",
      options: ["session", "day", "week"],
      default: "day",
    }),
    f("startsAt", "Start (ISO timestamp with timezone)", "Display"),
    f("endsAt", "End (ISO timestamp with timezone)", "Display"),
    f("desktop", "Show on desktop", "Display", { type: "toggle", default: true }),
    f("mobile", "Show on mobile", "Display", { type: "toggle", default: true }),
    f("dismissible", "Dismissible announcement bar", "Display", {
      type: "toggle",
      default: true,
      help: "Modals always have a close button and Escape dismissal.",
    }),
    f("campaignState", "Campaign status", "Display", {
      type: "select",
      options: ["active", "paused"],
      default: "paused",
    }),
    f("order", "Priority (lower first)", "Display", { type: "number" }),
  ],
};

export function defaultContent(kind: ContentKind): Content {
  return Object.fromEntries(
    contentFields[kind].map((field) => [
      field.key,
      field.default ??
        (field.type === "toggle"
          ? false
          : field.type === "number"
            ? 0
            : ["list", "links"].includes(field.type ?? "")
              ? []
              : ""),
    ]),
  ) as Content;
}
export const homeDefaults = defaultContent("page");
const plain = (max: number) =>
  z
    .string()
    .max(max)
    .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), "Use plain text, not HTML.");
export function validateContent(kind: ContentKind, input: unknown, publishing = false): Content {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of contentFields[kind]) {
    let schema: z.ZodTypeAny =
      field.type === "toggle"
        ? z.boolean()
        : field.type === "number"
          ? z.number().int().min(0).max(10000)
          : field.type === "links"
            ? z
                .array(
                  z
                    .object({
                      label: plain(80).refine((v) => v.trim().length > 0, "Enter a label."),
                      href: z
                        .string()
                        .refine((v) => safeHref(v), "Use an approved public path or HTTPS URL."),
                    })
                    .strict(),
                )
                .max(12)
            : field.type === "list"
              ? z
                  .array(plain(300).refine((v) => v.trim().length > 0, "Enter a nonempty item."))
                  .max(20)
              : field.type === "select"
                ? z.enum(field.options as [string, ...string[]])
                : plain(field.max ?? (field.type === "url" ? 2048 : 200));
    if (field.type === "url")
      schema = schema.refine(
        (value: string) => !value || safeHref(value),
        "Use an approved public path or HTTPS URL.",
      );
    if (publishing && field.required && !["toggle", "number"].includes(field.type ?? ""))
      schema = schema.refine(
        (value: string) => Boolean(value.trim()),
        `${field.label} is required.`,
      );
    shape[field.key] = schema.default(defaultContent(kind)[field.key]);
  }
  const result = z.object(shape).strict().parse(input) as Content;
  for (const key of [
    "recordingUrl",
    "deliveryUrl",
    "externalUrl",
    "formUrl",
    "followupFormUrl",
    "thankYouUrl",
    "coverUrl",
    "imageUrl",
    "portraitUrl",
  ])
    if (text(result, key) && !safeHref(text(result, key), true))
      throw new Error(`${key} requires a public HTTPS URL.`);
  if (
    publishing &&
    kind === "page" &&
    Boolean(text(result, "secondaryHref")) !== Boolean(text(result, "secondaryLabel"))
  )
    throw new Error("Supply both the secondary CTA label and destination, or leave both blank.");
  if (publishing && kind === "popup" && !flag(result, "desktop") && !flag(result, "mobile"))
    throw new Error("Enable desktop or mobile display before publishing.");
  if (
    kind === "webinar" &&
    text(result, "recordingUrl") &&
    text(result, "recordingProvider") === "vimeo" &&
    !["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(
      new URL(text(result, "recordingUrl")).hostname,
    )
  )
    throw new Error("Enter a Vimeo recording URL or choose External.");
  if (
    kind === "video" &&
    (publishing || text(result, "youtubeUrl")) &&
    !youtubeId(text(result, "youtubeUrl"))
  )
    throw new Error("Enter a valid YouTube watch, share, Shorts or embed URL.");
  if (
    kind === "page" &&
    text(result, "contactEmail") &&
    !z.string().email().safeParse(text(result, "contactEmail")).success
  )
    throw new Error("Enter a valid contact email.");
  for (const key of ["formId", "followupFormId", "tagId", "sequenceId", "nurtureSequenceId"])
    if (text(result, key) && !/^[1-9]\d{0,15}$/.test(text(result, key)))
      throw new Error(`${key} must be a positive Kit ID.`);
  for (const key of ["assetId", "promotionId"])
    if (text(result, key) && !z.string().uuid().safeParse(text(result, key)).success)
      throw new Error(`${key} must be a valid saved item ID.`);
  if (kind === "popup") {
    if (
      lines(result, "eligiblePages").some(
        (path) => !["/", "/insights", "/videos", "/webinars", "/resources"].includes(path),
      )
    )
      throw new Error("Promotions can target only the supported public marketing pages.");
    if (publishing && !lines(result, "eligiblePages").length)
      throw new Error("Select at least one eligible marketing page.");
    for (const key of ["startsAt", "endsAt"])
      if (
        text(result, key) &&
        (!/T.*(Z|[+-]\d\d:\d\d)$/.test(text(result, key)) ||
          !Number.isFinite(Date.parse(text(result, key))))
      )
        throw new Error("Campaign dates need an ISO timestamp with timezone.");
    if (
      text(result, "startsAt") &&
      text(result, "endsAt") &&
      Date.parse(text(result, "startsAt")) >= Date.parse(text(result, "endsAt"))
    )
      throw new Error("Campaign end must follow its start.");
  }
  if (
    publishing &&
    (kind === "webinar" || (kind === "resource" && text(result, "access") === "registration"))
  ) {
    if (
      !text(result, "formId") ||
      !safeHref(text(result, "formUrl"), true) ||
      !flag(result, "workflowConfirmed")
    )
      throw new Error(
        "Configure a dedicated Kit delivery form and confirm its delivery test before publishing.",
      );
    if (Boolean(text(result, "followupFormId")) !== Boolean(text(result, "followupFormUrl")))
      throw new Error("Optional nurture needs both its separate form ID and URL.");
    if (text(result, "followupFormId") && text(result, "followupFormId") === text(result, "formId"))
      throw new Error("Delivery and optional marketing must use separate Kit forms.");
    if (
      text(result, "followupFormId") &&
      (!text(result, "nurtureSequenceId") || !flag(result, "nurtureWorkflowConfirmed"))
    )
      throw new Error(
        "Configure and test the separate five-day nurture sequence before offering its signup.",
      );
  }
  if (
    publishing &&
    kind === "resource" &&
    !text(result, "assetId") &&
    !safeHref(text(result, "externalUrl"), true)
  )
    throw new Error("Supply a genuine PDF or external resource before publication.");
  if (
    kind === "webinar" &&
    text(result, "recordingUrl") &&
    text(result, "recordingProvider") === "youtube" &&
    !youtubeId(text(result, "recordingUrl"))
  )
    throw new Error("Enter a valid YouTube recording URL.");
  return result;
}

export function publicContent(kind: ContentKind, content: Content): Content {
  const result = { ...content };
  for (const key of [
    "recordingUrl",
    "deliveryUrl",
    "accessInstructions",
    "assetId",
    "formId",
    "followupFormId",
    "workflowConfirmed",
    "tagId",
    "sequenceId",
    "nurtureSequenceId",
    "thankYouUrl",
    "nurtureWorkflowConfirmed",
  ])
    delete result[key];
  if (kind === "resource" && text(content, "access") === "registration")
    delete result["externalUrl"];
  return result;
}
export function campaignEligible(
  content: Content,
  path: string,
  mobile: boolean,
  now: number,
): boolean {
  return (
    ["/", "/insights", "/videos", "/webinars", "/resources"].includes(path) &&
    lines(content, "eligiblePages").includes(path) &&
    text(content, "campaignState") === "active" &&
    flag(content, mobile ? "mobile" : "desktop") &&
    (!text(content, "startsAt") || Date.parse(text(content, "startsAt")) <= now) &&
    (!text(content, "endsAt") || Date.parse(text(content, "endsAt")) > now)
  );
}
