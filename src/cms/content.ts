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

// Bundled, reviewed brand assets can be selected in Pages without accepting arbitrary local paths.
export function safeImageHref(value: string): boolean {
  return /^\/brand\/[a-z0-9-]+\.(?:png|webp|jpe?g|svg)$/.test(value) || safeHref(value, true);
}
const imageFields = new Set([
  "coverUrl",
  "imageUrl",
  "portraitUrl",
  "heroImageUrl",
  "approachImageUrl",
  "snapshotImageUrl",
  "snapshotDetailImageUrl",
]);

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
    default: "Build a stronger organization behind your mission. | Iban Ison",
  }),
  f("ogDescription", "Social sharing description", "Search", {
    type: "textarea",
    max: 240,
    default:
      "Organizational strategy for nonprofit executives, boards and social impact leaders. Start with the free Smart Snapshot or a conversation with Nkoyo.",
  }),
  f("seoTitle", "SEO title", "Search", {
    max: 70,
    required: true,
    default: "Nonprofit Strategy & Governance | Iban Ison Solutions",
  }),
  f("seoDescription", "SEO description", "Search", {
    type: "textarea",
    max: 180,
    required: true,
    default:
      "Strengthen the organization behind your mission. Explore Culture, Capacity and Compliance with Iban Ison, take the free Smart Snapshot, or talk with Nkoyo.",
  }),
  f("heroEyebrow", "Hero eyebrow", "Hero", {
    default: "Nonprofit leadership · Strategy · Organizational readiness",
    max: 80,
  }),
  f("audience", "Audience", "Hero", {
    default: "For nonprofit executives, boards and social impact leaders",
    max: 160,
  }),
  f("heroTitle", "Hero headline", "Hero", {
    required: true,
    max: 120,
    default: "Build a stronger organization",
  }),
  f("heroHighlight", "Highlighted headline", "Hero", {
    max: 120,
    default: "behind your mission.",
  }),
  f("heroDescription", "Hero supporting description", "Hero", {
    type: "textarea",
    required: true,
    max: 500,
    default:
      "Bold missions need more than committed people. They need clear decisions, capable teams, aligned governance, and systems that support the work as demands grow.",
  }),
  f("ctaLabel", "Primary CTA label", "Calls to action", {
    required: true,
    max: 60,
    default: "Take the Free Snapshot",
  }),
  f("ctaHref", "Primary CTA destination", "Calls to action", {
    type: "url",
    required: true,
    default: "/snapshot",
  }),
  f("heroNote", "Supporting CTA note", "Hero", {
    type: "textarea",
    max: 240,
    default:
      "A free, guided reflection. See your findings on screen and choose whether to receive a detailed email report.",
  }),
  f("secondaryLabel", "Hero conversation label override (optional)", "Calls to action", {
    max: 60,
  }),
  f("secondaryHref", "Hero conversation destination override (optional)", "Calls to action", {
    type: "url",
  }),
  f("approachTitle", "Approach heading", "Our approach", {
    max: 180,
    default: "Big missions need strong foundations.",
  }),
  f("approachBody", "Approach explanation", "Our approach", {
    type: "textarea",
    max: 900,
    default:
      "Unclear decisions. Stretched teams. Competing priorities. Sometimes the mission is growing faster than the systems behind it.\n\nThese pressures rarely exist in isolation. We help you see the connections—and find a practical place to begin.",
  }),
  f("approachNote", "Approach supporting message", "Our approach", {
    type: "textarea",
    max: 500,
    default: "The mission matters. So does the organization carrying it.",
  }),
  f("howVisible", "Show featured Smart Snapshot", "Smart Snapshot", {
    type: "toggle",
    default: true,
  }),
  f("howTitle", "How it works heading", "How it works", {
    max: 160,
    default: "A thoughtful pause. A clearer starting point.",
  }),
  f("howBody", "How it works explanation", "How it works", {
    type: "textarea",
    max: 800,
    default:
      "The Smart Snapshot brings structure to what you're experiencing, one relevant question at a time.",
  }),
  f("howNote", "Reflection note", "How it works", {
    max: 400,
    default:
      "The free Snapshot is a guided reflection, not a formal organizational or legal assessment. It does not replace Nkoyo’s professional assessments or advisory engagements.",
  }),
  ...[0, 1, 2].flatMap((n) => [
    f(`benefit${n}Label`, `Card ${n + 1} label`, "Benefit cards", {
      max: 60,
      default: ["01", "02", "03"][n]!,
    }),
    f(`benefit${n}Title`, `Card ${n + 1} takeaway`, "Benefit cards", {
      max: 120,
      default: ["Reflect", "Discover", "Move forward"][n]!,
    }),
    f(`benefit${n}Body`, `Card ${n + 1} explanation`, "Benefit cards", {
      type: "textarea",
      max: 500,
      default: [
        "Answer guided questions about your organization's current challenges.",
        "Explore personalized findings and possible patterns across Culture, Capacity and Compliance.",
        "Identify questions and practical next steps worth exploring with your team or board.",
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
    default: "Three connected dimensions. One stronger organization.",
  }),
  f("dimensionsBody", "Dimensions introduction", "Three dimensions", {
    type: "textarea",
    max: 500,
    default:
      "Culture, Capacity and Compliance shape one another. The Impact Triad™ brings these three dimensions together to support clear decisions and sustainable organizational progress.",
  }),
  ...[0, 1, 2].flatMap((n) => [
    f(
      `dimension${n}Blurb`,
      `${["Culture", "Capacity", "Compliance"][n]} summary`,
      "Three dimensions",
      {
        max: 160,
        default: [
          "How people work together.",
          "What makes the work possible.",
          "How responsible action takes shape.",
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
          "How people lead, collaborate, communicate and put values into practice.",
          "Whether people, systems, resources and decision-making structures can support the work.",
          "How governance, accountability and organizational obligations support responsible action.",
        ][n]!,
      },
    ),
  ]),
  f("aboutVisible", "Show About Nkoyo", "About", { type: "toggle", default: true }),
  f("aboutTitle", "About heading", "About", {
    max: 160,
    default: "Educator at heart. Attorney by training. Strategist by experience.",
  }),
  f("aboutBody", "About copy", "About", {
    type: "textarea",
    max: 2000,
    default:
      "An educator at heart and attorney by training, Nkoyo Effiong Lewis is the founder and Chief Impact Strategist of Iban Ison Solutions. Her experience spans teaching, nonprofit work, nonprofit law and organizational strategy.\n\nShe combines an understanding of governance with practical management strategies to help leaders navigate complexity. Her approach considers your organization’s people, resources and responsibilities together, so the next step fits the context of your mission.",
  }),
  f("portraitUrl", "Approved portrait URL", "About", {
    type: "url",
    default: "/brand/nkoyo-founder-speaking.webp",
  }),
  f("portraitAlt", "Portrait description", "About", {
    max: 180,
    default: "Nkoyo Effiong Lewis speaking into a microphone",
  }),
  f("bookingHref", "Booking destination", "Calls to action", {
    type: "url",
    default: "https://calendly.com/nkoyo/3cdiscoverycall",
  }),
  f("bookingLabel", "Booking label", "Calls to action", {
    max: 80,
    default: "Book a Conversation",
  }),
  f("bookingBody", "Booking explanation", "Calls to action", {
    type: "textarea",
    max: 500,
    default:
      "Discuss your organization’s priorities, ask questions and explore what meaningful support could look like. You can book without taking the Snapshot.",
  }),
  f("beginVisible", "Show Two Ways to Begin", "Two ways to begin", {
    type: "toggle",
    default: true,
  }),
  f("beginTitle", "Pathways heading", "Two ways to begin", {
    max: 180,
    default: "You don't have to figure it all out on your own.",
  }),
  f("beginBody", "Pathways introduction", "Two ways to begin", {
    type: "textarea",
    max: 700,
    default:
      "Whether you're trying to understand what's creating friction or you're ready to explore what needs to change, there's a place to begin.",
  }),
  f("snapshotPathTitle", "Snapshot pathway title", "Two ways to begin", {
    max: 120,
    default: "Take the Smart Snapshot",
  }),
  f("snapshotPathBody", "Snapshot pathway description", "Two ways to begin", {
    type: "textarea",
    max: 700,
    default:
      "Explore possible patterns affecting your organization and identify a practical starting point through our free guided assessment.",
  }),
  f("conversationPathTitle", "Conversation pathway title", "Two ways to begin", {
    max: 120,
    default: "Talk with Nkoyo",
  }),
  f("conversationPathBody", "Conversation pathway description", "Two ways to begin", {
    type: "textarea",
    max: 700,
    default:
      "Every organization has its own challenges, context, and ambitions. Schedule a conversation with Nkoyo to discuss your priorities, ask questions, and explore what meaningful support could look like.",
  }),
  f("testimonialsVisible", "Show verified client testimonials", "Testimonials", {
    type: "toggle",
    default: true,
  }),
  f("testimonialsTitle", "Testimonials heading", "Testimonials", {
    max: 180,
    default: "Real perspectives. Meaningful relationships.",
  }),
  ...[0, 1].flatMap((n) => [
    f(`testimonial${n}Quote`, `Testimonial ${n + 1} exact excerpt`, "Testimonials", {
      type: "textarea",
      max: 600,
      default: [
        "Warm, insightful, and has your best interest in heart all the way.",
        "…a clear and actionable roadmap for my business.",
      ][n]!,
      help: "Use a verified verbatim quotation. Keep the source and attribution together; do not invent outcomes.",
    }),
    f(`testimonial${n}Attribution`, `Testimonial ${n + 1} attribution`, "Testimonials", {
      max: 180,
      default: ["J. Almond, Founder", "R. Tedder, CEO"][n]!,
    }),
    f(`testimonial${n}Source`, `Testimonial ${n + 1} source`, "Testimonials", {
      type: "url",
      default: "https://ibanison.com/#testimonials",
    }),
  ]),
  f("closingVisible", "Show closing Snapshot CTA", "Closing CTA", {
    type: "toggle",
    default: true,
  }),
  f("closingTitle", "Closing heading", "Closing CTA", {
    max: 180,
    default: "Your mission deserves a stronger foundation.",
  }),
  f("closingBody", "Closing explanation", "Closing CTA", {
    type: "textarea",
    max: 600,
    default:
      "Explore what may be creating friction, or have a conversation about where your organization wants to go next.",
  }),
  f("featuredVisible", "Show Insights & Resources", "Featured libraries", {
    type: "toggle",
    default: true,
    help: "Displays published library content only. Empty categories are hidden. Featured items sort first; up to three items appear in each selected category.",
  }),
  f("insightsTitle", "Insights heading", "Featured libraries", {
    max: 180,
    default: "Insights & Resources",
  }),
  f("insightsBody", "Insights introduction", "Featured libraries", {
    type: "textarea",
    max: 500,
    default:
      "Ideas and practical perspectives to support your next conversation, decision or step forward.",
  }),
  f("heroImageUrl", "Approved hero photograph", "Hero", {
    type: "url",
    default: "/brand/nkoyo-hero-smiling.webp",
    help: "Genuine approved photograph only. The bundled brand portrait is used by default.",
  }),
  f("heroImageAlt", "Hero photograph description", "Hero", {
    max: 180,
    default: "Nkoyo Effiong Lewis, founder of Iban Ison Solutions",
  }),
  f("heroImageCaption", "Hero photograph caption", "Hero", {
    max: 160,
    default: "Nkoyo Effiong Lewis · Founder & Chief Impact Strategist",
  }),
  f("stripVisible", "Show the brand statement strip", "Brand statement", {
    type: "toggle",
    default: true,
  }),
  f("stripItems", "Brand statement phrases", "Brand statement", {
    type: "list",
    default: ["Culture", "Capacity", "Compliance", "Sustainable impact"],
  }),
  f("approachVisible", "Show the challenge section", "Our approach", {
    type: "toggle",
    default: true,
  }),
  f("approachEyebrow", "Challenge eyebrow", "Our approach", { max: 80, default: "The challenge" }),
  f("approachImageUrl", "Approved collaboration photograph", "Our approach", {
    type: "url",
    default: "/brand/collaboration.webp",
  }),
  f("approachImageAlt", "Collaboration photograph description", "Our approach", {
    max: 180,
    default: "Three people sharing ideas and working together around laptops",
  }),
  f("dimensionsEyebrow", "Framework eyebrow", "Three dimensions", {
    max: 100,
    default: "Our perspective · The Impact Triad™",
  }),
  f("showcaseVisible", "Show the Snapshot product showcase", "Snapshot showcase", {
    type: "toggle",
    default: true,
  }),
  f("showcaseEyebrow", "Showcase eyebrow", "Snapshot showcase", {
    max: 80,
    default: "The free Smart Snapshot",
  }),
  f("showcaseTitle", "Showcase headline", "Snapshot showcase", {
    max: 160,
    default: "Clarity starts with better questions.",
  }),
  f("showcaseBody", "Showcase explanation", "Snapshot showcase", {
    type: "textarea",
    max: 700,
    default:
      "When you're close to the day-to-day work, it can be difficult to see which pressures deserve attention first. The Smart Snapshot helps you explore the patterns behind those challenges.",
  }),
  f("showcaseCtaLabel", "Showcase Snapshot button", "Snapshot showcase", {
    max: 60,
    default: "Start Your Snapshot",
  }),
  f("snapshotImageUrl", "Real Snapshot interface screenshot", "Snapshot showcase", {
    type: "url",
    default: "/brand/snapshot-question.png",
    help: "Use an actual interface capture with no personal information or real assessment answers.",
  }),
  f("snapshotImageAlt", "Snapshot screenshot description", "Snapshot showcase", {
    max: 220,
    default:
      "The Snapshot asks where getting work moving becomes difficult, with five choice-based answers.",
  }),
  f("snapshotDetailImageUrl", "Second real Snapshot screenshot", "Snapshot showcase", {
    type: "url",
    default: "/brand/snapshot-pressures.png",
  }),
  f("snapshotDetailImageAlt", "Second screenshot description", "Snapshot showcase", {
    max: 220,
    default: "A follow-up Snapshot question explores pressures on people and resources.",
  }),
  f("snapshotImageCaption", "Product screenshot caption", "Snapshot showcase", {
    max: 180,
    default: "A look inside the Snapshot. Actual questions, shown without personal answers.",
  }),
  f("aboutName", "Founder name", "About", { max: 100, default: "Nkoyo Effiong Lewis" }),
  f("aboutEyebrow", "Founder eyebrow", "About", { max: 80, default: "Meet the founder" }),
  f("aboutCredentials", "Verified areas of practice", "About", {
    type: "list",
    default: ["Nonprofit strategy", "Governance & accountability", "Leadership & change"],
  }),
  f("faqVisible", "Show frequently asked questions", "Frequently asked questions", {
    type: "toggle",
    default: true,
  }),
  f("faqEyebrow", "FAQ eyebrow", "Frequently asked questions", {
    max: 80,
    default: "A little more clarity",
  }),
  f("faqTitle", "FAQ heading", "Frequently asked questions", {
    max: 180,
    default: "Good questions. Clear answers.",
  }),
  f("faqBody", "FAQ supporting text", "Frequently asked questions", {
    type: "textarea",
    max: 500,
    default:
      "Start where you are. Here's what to expect from the Snapshot—and how to begin a conversation.",
  }),
  ...[
    [
      "Who is the Smart Snapshot designed for?",
      "The Snapshot is for nonprofit executives, board members and social impact leaders who want to reflect on pressures across Culture, Capacity and Compliance. You can use it as a starting point for a conversation with your team or board.",
    ],
    [
      "How long does it take?",
      "It depends on your pace and the follow-up questions relevant to your answers. Most of the flow uses choices rather than written responses, and the final written reflection is optional. There is no time limit.",
    ],
    [
      "Will I receive my results immediately?",
      "Your Snapshot findings appear on screen after you complete the assessment. If you request a detailed email report, it is prepared separately from your answers. It usually takes about five minutes; processing times can vary.",
    ],
    [
      "Is this a formal organizational assessment?",
      "No. The free Snapshot is a guided reflection, not a formal organizational or legal assessment. It identifies possible patterns to explore and does not replace Nkoyo's professional assessments, legal advice or an advisory engagement.",
    ],
    [
      "Can I speak with Nkoyo without taking the Snapshot?",
      "Yes. Book a conversation directly to share your priorities, ask questions and explore what support might be useful. Taking the Snapshot is not a requirement.",
    ],
    [
      "What happens when I request email follow-up?",
      "You can request a detailed report by email after viewing your on-screen results. Four personalized follow-up emails are a separate, optional choice, scheduled for days 2, 4, 7 and 10. You can unsubscribe at any time.",
    ],
  ].flatMap(([question, answer], n) => [
    f(`faq${n}Question`, `Question ${n + 1}`, "Frequently asked questions", {
      max: 180,
      default: question!,
    }),
    f(`faq${n}Answer`, `Answer ${n + 1}`, "Frequently asked questions", {
      type: "textarea",
      max: 900,
      default: answer!,
    }),
  ]),
  f("footerStatement", "Footer positioning statement", "Navigation and footer", {
    max: 300,
    default:
      "Stronger organizations. Sustainable impact. Strategy and support for the people moving missions forward.",
  }),
  f("navigationLinks", "Header navigation", "Navigation and footer", {
    type: "links",
    default: [
      { label: "Home", href: "/" },
      { label: "Our Approach", href: "/#approach" },
      { label: "Smart Snapshot", href: "/#smart-snapshot" },
      { label: "About Nkoyo", href: "/#about" },
      { label: "Insights & Resources", href: "/resources" },
    ],
  }),
  f("footerLinks", "Snapshot footer links", "Navigation and footer", {
    type: "links",
    default: [
      { label: "Take the Free Snapshot", href: "/snapshot" },
      { label: "Our Approach", href: "/#approach" },
      { label: "About Nkoyo", href: "/#about" },
      { label: "Blog", href: "/insights" },
      { label: "Videos", href: "/videos" },
      { label: "Resources", href: "/resources" },
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
        (value: string) =>
          !value || (imageFields.has(field.key) ? safeImageHref(value) : safeHref(value)),
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
  ])
    if (text(result, key) && !safeHref(text(result, key), true))
      throw new Error(`${key} requires a public HTTPS URL.`);
  for (const key of imageFields)
    if (text(result, key) && !safeImageHref(text(result, key)))
      throw new Error(`${key} requires an approved brand asset path or public HTTPS image URL.`);
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
