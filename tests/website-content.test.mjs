import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  defaultContent,
  validateContent,
  publicContent,
  safeHref,
  safeImageHref,
  youtubeId,
  campaignEligible,
  HOME_ID,
  homeDefaults,
} from "../src/cms/content.ts";
import { eligiblePosts, kitContentClient } from "../src/cms/kit-content.server.ts";
import { contentService } from "../src/cms/service.server.ts";
import { homepageContentGroups } from "../src/cms/homepage-content.ts";
const id = "10000000-0000-4000-8000-000000000001";
const assetId = "20000000-0000-4000-8000-000000000001";

test("Homepage image configuration accepts reviewed assets without opening arbitrary local paths", () => {
  for (const value of [
    "/brand/nkoyo-hero.webp",
    "/brand/snapshot-question.png",
    "https://example.com/portrait.webp",
  ])
    assert.equal(safeImageHref(value), true, value);
  for (const value of [
    "/brand/../private.png",
    "/brand/%2e%2e/private.png",
    "/admin/private.png",
    "file:///private.png",
    "http://localhost/photo.png",
    "https://127.0.0.1/photo.png",
    "data:image/svg+xml,x",
  ])
    assert.equal(safeImageHref(value), false, value);
  const saved = validateContent(
    "page",
    {
      ...homeDefaults,
      heroTitle: "Saved editorial headline",
      faq0Answer: "Saved answer.",
      faqVisible: false,
    },
    true,
  );
  assert.equal(saved.heroTitle, "Saved editorial headline");
  assert.equal(saved.faq0Answer, "Saved answer.");
  assert.equal(saved.faqVisible, false);
  assert.equal(saved.heroImageUrl, "/brand/nkoyo-hero-smiling.webp");
  assert.throws(() =>
    validateContent("page", { ...homeDefaults, heroImageUrl: "/admin/private.png" }, true),
  );
});
const draft = (kind, extra = {}) => ({
  ...defaultContent(kind),
  title: "Real guidance",
  description: "Useful guidance for leaders.",
  ...extra,
});
const doc = (kind, content, extra = {}) => ({
  id,
  kind,
  slug: "guidance",
  title: "Guidance",
  draft: content,
  published: null,
  revision: 0,
  published_revision: 0,
  archived: false,
  source_ref: null,
  updated_at: "",
  published_at: null,
  updated_by: null,
  ...extra,
});
function fixture(rows = []) {
  let cache = null;
  let mutations = 0;
  const assets = new Map();
  const events = [];
  const store = {
    requireAdmin: async (actor) => {
      if (actor !== "admin") throw Error("Administrator required");
    },
    list: async (kind) => rows.filter((r) => r.kind === kind),
    get: async (id) => rows.find((r) => r.id === id) ?? null,
    published: async () =>
      rows
        .filter((r) => r.published && !r.archived)
        .map(({ id, kind, slug, published, published_at, published_revision, source_ref }) => ({
          id,
          kind,
          slug,
          published,
          published_at,
          published_revision,
          source_ref,
        })),
    cache: async () => cache,
    saveCache: async (c) => {
      cache = c;
    },
    versions: async () => [],
    mutate: async (args) => {
      mutations++;
      return args;
    },
    asset: async (id) => assets.get(id),
    insertAsset: async (a) => {
      assets.set(a.id, a);
    },
    finishAsset: async (id, status) => {
      assets.get(id).status = status;
    },
    recordEvent: async (e) => events.push(e),
    storage: {
      createSignedUploadUrl: async () => ({ data: { token: "scoped-upload" }, error: null }),
      download: async () => ({
        data: new Blob(["%PDF-test"], { type: "application/pdf" }),
        error: null,
      }),
      createSignedUrl: async () => ({
        data: { signedUrl: "https://storage.example.com/short-lived.pdf" },
        error: null,
      }),
    },
  };
  return {
    store,
    assets,
    events,
    get mutations() {
      return mutations;
    },
    setCache: (c) => {
      cache = c;
    },
    getCache: () => cache,
  };
}
const input = (kind, content, action = "publish") => ({
  id,
  kind,
  slug: "guidance",
  title: "Guidance",
  draft: content,
  expected: 0,
  action,
});
const delivery = {
  formId: "1",
  formUrl: "https://example.kit.com/guidance",
  workflowConfirmed: true,
};
test("CMS validates links, text, actual homepage fields and common YouTube URL forms", () => {
  for (const href of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//evil.example",
    "http://example.com",
    "https://user:secret@example.com",
    "https://127.0.0.1/x",
    "/admin",
    "/api/email-jobs",
    "/results",
    "/resources/%2e%2e/admin",
    "https://example.local/x",
  ])
    assert.equal(safeHref(href), false, href);
  for (const href of [
    "/",
    "/#about",
    "/snapshot",
    "/resources/governance",
    "https://example.kit.com/path",
  ])
    assert.equal(safeHref(href), true, href);
  for (const url of [
    "https://www.youtube.com/watch?v=abcdefghijk",
    "https://youtu.be/abcdefghijk",
    "https://www.youtube.com/shorts/abcdefghijk",
    "https://www.youtube-nocookie.com/embed/abcdefghijk",
  ])
    assert.equal(youtubeId(url), "abcdefghijk");
  for (const url of [
    "https://youtube.com.evil.example/watch?v=abcdefghijk",
    "https://youtube.com/watch?v=short",
    "<iframe src=x>",
  ])
    assert.equal(youtubeId(url), null);
  assert.equal(validateContent("page", homeDefaults, true).ctaHref, "/snapshot");
  assert.throws(() =>
    validateContent("page", { ...homeDefaults, heroTitle: "<script>alert(1)</script>" }, true),
  );
  assert.throws(() =>
    validateContent("page", { ...homeDefaults, assessmentLogic: "modify" }, true),
  );
  assert.throws(() =>
    validateContent("video", draft("video", { youtubeUrl: "https://example.com/embed/foo" }), true),
  );
  assert.throws(() => validateContent("resource", draft("resource"), true));
  assert.doesNotThrow(() => validateContent("resource", draft("resource"), false));
});
test("Kit only accepts free, public, published posts; pagination is GET only and atomic on errors", async () => {
  const row = {
    id: 1,
    title: "A useful article",
    description: "<p>Plain summary</p>",
    status: "published",
    is_paid: false,
    published_at: "2026-01-01T00:00:00Z",
    public_url: "https://example.kit.com/posts/one",
  };
  assert.equal(
    eligiblePosts([
      row,
      { ...row, id: 2, is_paid: true },
      { ...row, id: 3, status: "draft" },
      { ...row, id: 4, public_url: null },
      { ...row, id: 5, is_paid: undefined },
      { ...row, id: 6, published_at: "2999-01-01" },
    ]).length,
    1,
  );
  const calls = [];
  const kit = kitContentClient("private-key", async (url, opts) => {
    calls.push({ url: String(url), opts });
    return Response.json({
      posts: [{ ...row, id: calls.length }],
      pagination: { has_next_page: calls.length === 1, end_cursor: "next" },
    });
  });
  assert.equal((await kit.posts()).length, 2);
  assert.match(calls[1].url, /after=next/);
  assert.equal(calls[0].opts.method, undefined);
  assert.equal(calls[0].opts.headers["X-Kit-Api-Key"], "private-key");
  assert.equal(calls[0].opts.signal.aborted, false);
  await assert.rejects(
    () =>
      kitContentClient("x", async () => {
        throw new DOMException("Timeout", "TimeoutError");
      }).posts(),
    /five seconds/,
  );
  await assert.rejects(() => kitContentClient(undefined, fetch).forms(), /KIT_API_KEY/);
  await assert.rejects(
    () =>
      kitContentClient("x", async () =>
        Response.json({ posts: [row], pagination: { has_next_page: true, end_cursor: "same" } }),
      ).posts(),
    /pagination/,
  );
});
test("Every private CMS operation denies staff before reading or mutating content", async () => {
  const f = fixture();
  const svc = contentService(f.store, { posts: async () => [], forms: async () => [] });
  for (const run of [
    () => svc.list("staff", "page"),
    () => svc.history("staff", id),
    () => svc.sync("staff"),
    () => svc.mutate("staff", input("video", draft("video"))),
    () => svc.initUpload("staff", "x.pdf", 20),
    () => svc.finishUpload("staff", assetId),
    () => svc.assetPreview("staff", assetId),
  ])
    await assert.rejects(run, /Administrator/);
  assert.equal(f.mutations, 0);
  assert.equal(f.assets.size, 0);
});
test("Failed publication never enters the write transaction; gates need separate verified forms", async () => {
  const f = fixture();
  let calls = 0;
  const svc = contentService(f.store, {
    forms: async () => {
      calls++;
      return [
        { id: 1, embed_url: delivery.formUrl, archived: false },
        { id: 2, embed_url: "https://example.kit.com/nurture", archived: false },
      ];
    },
    posts: async () => [],
  });
  await assert.rejects(
    () =>
      svc.mutate(
        "admin",
        input("webinar", draft("webinar", { recordingUrl: "https://youtu.be/abcdefghijk" })),
      ),
    /delivery form/,
  );
  await assert.rejects(
    () =>
      svc.mutate(
        "admin",
        input(
          "webinar",
          draft("webinar", {
            ...delivery,
            recordingUrl: "https://youtu.be/abcdefghijk",
            formUrl: "https://other.example.com",
          }),
        ),
      ),
    /does not match/,
  );
  await assert.rejects(
    () =>
      svc.mutate(
        "admin",
        input(
          "resource",
          draft("resource", {
            access: "registration",
            externalUrl: "https://example.com/private.pdf",
            ...delivery,
            followupFormId: "1",
            followupFormUrl: delivery.formUrl,
          }),
        ),
      ),
    /separate Kit forms/,
  );
  assert.equal(f.mutations, 0);
  assert.equal(calls, 1);
  await svc.mutate(
    "admin",
    input(
      "webinar",
      draft("webinar", {
        ...delivery,
        recordingUrl: "https://youtu.be/abcdefghijk",
        followupFormId: "2",
        nurtureSequenceId: "12",
        nurtureWorkflowConfirmed: true,
        followupFormUrl: "https://example.kit.com/nurture",
      }),
    ),
  );
  assert.equal(f.mutations, 1);
  await assert.rejects(
    () => svc.mutate("admin", { ...input("page", homeDefaults), slug: "snapshot" }),
    /Only the existing homepage/,
  );
});
test("Public projection excludes drafts, private recordings, gated PDFs and internal Kit settings", async () => {
  const privateContent = draft("webinar", {
    ...delivery,
    recordingUrl: "https://youtu.be/abcdefghijk",
    deliveryUrl: "https://private.example.com",
    accessInstructions: "private notes",
    tagId: "7",
    sequenceId: "8",
  });
  const f = fixture([
    doc("webinar", privateContent, { published: privateContent, published_revision: 3 }),
    doc("resource", draft("resource"), { id: assetId }),
  ]);
  const bundle = await contentService(f.store).publicBundle();
  assert.equal(bundle.items.length, 1);
  const serialized = JSON.stringify(bundle);
  for (const secret of [
    "private.example.com",
    "private notes",
    "abcdefghijk",
    "workflowConfirmed",
    "sequenceId",
    "formId",
  ])
    assert.ok(!serialized.includes(secret), secret);
  assert.equal(bundle.items[0].content.formUrl, delivery.formUrl);
  const gated = publicContent(
    "resource",
    draft("resource", {
      access: "registration",
      assetId,
      externalUrl: "https://example.com/private.pdf",
    }),
  );
  assert.equal(gated.assetId, undefined);
  assert.equal(gated.externalUrl, undefined);
  f.store.published = async () => {
    throw Error("Database unavailable");
  };
  assert.deepEqual((await contentService(f.store).publicBundle()).home, homeDefaults);
});
test("A failed Kit sync retains the complete cache; public preferences cannot expose absent or expired articles", async () => {
  const now = new Date().toISOString();
  const article = {
    id: "1",
    title: "Public article",
    summary: "Summary",
    url: "https://example.kit.com/posts/one",
    date: now,
    thumbnail: "",
    alt: "",
  };
  const c = defaultContent("blog");
  const f = fixture([
    doc("blog", c, { source_ref: "1", published: c }),
    doc("blog", c, { id: assetId, source_ref: "2", published: c }),
  ]);
  f.setCache({
    key: "kit_posts",
    payload: [article],
    last_success_at: now,
    last_attempt_at: now,
    last_error: null,
  });
  const svc = contentService(f.store, {
    posts: async () => {
      throw Error("Kit unavailable");
    },
    forms: async () => [],
  });
  await assert.rejects(() => svc.sync("admin"), /Kit unavailable/);
  assert.deepEqual(f.getCache().payload, [article]);
  assert.equal((await svc.publicBundle()).items.length, 1);
  f.setCache({ ...f.getCache(), last_success_at: "2020-01-01T00:00:00Z" });
  assert.equal((await svc.publicBundle()).items.length, 0);
  f.setCache({ ...f.getCache(), last_success_at: now, payload: [] });
  assert.equal((await svc.publicBundle()).items.length, 0);
});
test("Private PDF upload verifies signature, MIME, size and creator; gated resources cannot obtain public downloads", async () => {
  const f = fixture();
  const svc = contentService(f.store);
  await assert.rejects(() => svc.initUpload("admin", "x.exe", 100), /PDF/);
  await assert.rejects(() => svc.initUpload("admin", "x.pdf", 10485761), /10 MB/);
  const upload = await svc.initUpload("admin", "guide.pdf", 9);
  assert.equal(f.assets.get(upload.id).status, "pending");
  await svc.finishUpload("admin", upload.id);
  assert.equal(f.assets.get(upload.id).status, "ready");
  const wrong = await svc.initUpload("admin", "fake.pdf", 9);
  f.store.storage.download = async () => ({
    data: new Blob(["badbytes!"], { type: "application/pdf" }),
    error: null,
  });
  await assert.rejects(() => svc.finishUpload("admin", wrong.id), /verification/);
  assert.equal(f.assets.get(wrong.id).status, "rejected");
  const gated = fixture([
    doc(
      "resource",
      {},
      { published: draft("resource", { access: "registration", assetId: upload.id }) },
    ),
  ]);
  await assert.rejects(() => contentService(gated.store).download(id), /not publicly/);
  const open = fixture([
    doc(
      "resource",
      {},
      {
        published: draft("resource", {
          access: "open",
          externalUrl: "https://example.com/real.pdf",
        }),
      },
    ),
  ]);
  assert.equal(await contentService(open.store).download(id), "https://example.com/real.pdf");
});
test("Promotions are restricted by page, dates and devices; optional events require published opt-in configuration", async () => {
  const c = draft("popup", {
    headline: "Guidance",
    ctaLabel: "Explore",
    ctaHref: "/resources",
    eligiblePages: ["/", "/videos"],
    campaignState: "active",
    startsAt: "2026-01-01T00:00:00Z",
    endsAt: "2027-01-01T00:00:00Z",
    mobile: false,
  });
  const now = Date.parse("2026-10-01T00:00:00Z");
  for (const path of [
    "/admin",
    "/snapshot",
    "/results",
    "/auth",
    "/report-requested",
    "/resources/private",
    "/api/email-jobs",
  ])
    assert.equal(campaignEligible(c, path, false, now), false);
  assert.equal(campaignEligible(c, "/", false, now), true);
  assert.equal(campaignEligible(c, "/", true, now), false);
  assert.equal(campaignEligible(c, "/", false, Date.parse("2028-01-01")), false);
  assert.throws(() => validateContent("popup", { ...c, eligiblePages: ["/snapshot"] }, true));
  const f = fixture([
    doc("page", homeDefaults, { id: HOME_ID, published: homeDefaults }),
    doc("popup", c, { published: c }),
  ]);
  const svc = contentService(f.store);
  assert.equal(await svc.event(id, assetId, "popup_click", true), false);
  assert.equal(f.events.length, 0);
  f.store.published = async () => [
    { id: HOME_ID, published: { analyticsEnabled: true } },
    { id, published: c },
  ];
  assert.equal(await svc.event(id, assetId, "popup_click", false), false);
  assert.equal(await svc.event(id, assetId, "popup_click", true), true);
  assert.equal(f.events.length, 1);
});
test("CMS adds authenticated server functions and preserves CSRF and private module boundaries", () => {
  const actions = readFileSync(new URL("../src/cms/actions.ts", import.meta.url), "utf8");
  for (const name of [
    "listContent",
    "contentHistory",
    "changeContent",
    "syncArticles",
    "beginPdfUpload",
    "finishPdfUpload",
    "previewPdf",
  ]) {
    const block = actions
      .slice(actions.indexOf(`export const ${name}`) + 13)
      .split("export const")[0];
    assert.match(block, /middleware\(\[requireSupabaseAuth\]\)/);
  }
  assert.match(
    readFileSync(new URL("../src/start.ts", import.meta.url), "utf8"),
    /createCsrfMiddleware/,
  );
  assert.doesNotMatch(
    readFileSync(new URL("../src/cms/kit-content.server.ts", import.meta.url), "utf8"),
    /subscribers|broadcasts|method:\s*["']POST/,
  );
});

test("Homepage library groups respect homepage opt-outs and hide empty categories", () => {
  const item = (kind, id, content = {}) => ({
    kind,
    id,
    content,
    slug: id,
    revision: 1,
    date: "2026-10-01T00:00:00Z",
  });
  assert.deepEqual(homepageContentGroups([]), []);
  const groups = homepageContentGroups([
    item("blog", "article"),
    item("video", "not-for-homepage", { homepage: false, featured: true }),
    item("video", "selected-video", { homepage: true }),
    item("popup", "campaign", { homepage: true }),
    ...Array.from({ length: 6 }, (_, n) =>
      item("resource", `resource-${n}`, { homepage: true, featured: n === 5, order: n }),
    ),
  ]);
  assert.deepEqual(
    groups.map((g) => g.kind),
    ["blog", "video", "resource"],
  );
  assert.deepEqual(
    groups[1].items.map((i) => i.id),
    ["selected-video"],
  );
  assert.equal(groups[2].items.length, 4);
  assert.equal(groups[2].items[0].id, "resource-5");
});
