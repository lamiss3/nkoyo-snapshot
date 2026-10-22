import {
  HOME_ID,
  defaultContent,
  flag,
  homeDefaults,
  publicContent,
  text,
  validateContent,
  type Content,
  type ContentKind,
} from "./content.ts";
import { cmsStore, type CmsStore } from "./store.server.ts";
import { kitContentClient, type KitPost } from "./kit-content.server.ts";
export interface PublicItem {
  id: string;
  kind: ContentKind;
  slug: string;
  content: Content;
  revision: number;
  date: string | null;
}
export interface PublicBundle {
  home: Content;
  items: PublicItem[];
  blogCheckedAt: string | null;
  unavailable: boolean;
}
export type Mutation = {
  id: string;
  kind: ContentKind;
  slug: string;
  title: string;
  draft: Content;
  expected: number;
  action: "save" | "publish" | "unpublish" | "archive" | "restore";
  restore?: string | undefined;
  sourceRef?: string | undefined;
};
export function contentService(store: CmsStore, kit = kitContentClient()) {
  async function sync() {
    const old = await store.cache();
    const now = new Date().toISOString();
    try {
      const posts = await kit.posts();
      await store.saveCache({
        key: "kit_posts",
        payload: posts,
        last_attempt_at: now,
        last_success_at: now,
        last_error: null,
      });
      return posts;
    } catch (error) {
      await store.saveCache({
        key: "kit_posts",
        payload: old?.payload ?? [],
        last_success_at: old?.last_success_at ?? null,
        last_attempt_at: now,
        last_error: error instanceof Error ? error.message : "Kit synchronization failed.",
      });
      throw error;
    }
  }
  async function checkRegistration(content: Content) {
    const forms = await kit.forms();
    for (const prefix of ["", "followup"]) {
      const id = text(content, prefix ? "followupFormId" : "formId");
      if (!id) continue;
      const url = text(content, prefix ? "followupFormUrl" : "formUrl");
      if (!forms.some((f) => String(f.id) === id && f.archived === false && f.embed_url === url))
        throw new Error(
          "A configured Kit form is unavailable or its URL does not match. Check the active form in Kit before publishing.",
        );
    }
  }
  return {
    async list(actor: string, kind: ContentKind) {
      await store.requireAdmin(actor);
      const documents = await store.list(kind);
      return {
        documents,
        cache: kind === "blog" ? await store.cache() : null,
        kitConfigured: Boolean(process.env["KIT_API_KEY"]),
      };
    },
    async history(actor: string, id: string) {
      await store.requireAdmin(actor);
      return store.versions(id);
    },
    async sync(actor: string) {
      await store.requireAdmin(actor);
      const posts = await sync();
      const existing = await store.list("blog");
      for (const post of posts) {
        if (existing.some((d) => d.source_ref === post.id)) continue;
        await store.mutate({
          p_actor: actor,
          p_id: crypto.randomUUID(),
          p_kind: "blog",
          p_slug: `kit-${post.id}`,
          p_title: post.title.slice(0, 160),
          p_draft: defaultContent("blog"),
          p_expected: 0,
          p_action: "save",
          p_source_ref: post.id,
        });
      }
      return posts.length;
    },
    async mutate(actor: string, input: Mutation) {
      await store.requireAdmin(actor);
      const old = await store.get(input.id);
      if (input.kind === "page" && (input.id !== HOME_ID || input.slug !== "home"))
        throw new Error("Only the existing homepage can be edited here.");
      if (["unpublish", "archive", "restore"].includes(input.action) && !old)
        throw new Error("Save this item before changing its publication status.");
      const draft = ["save", "publish"].includes(input.action)
        ? validateContent(input.kind, input.draft, input.action === "publish")
        : input.draft;
      if (input.action === "publish") {
        if (
          input.kind === "webinar" ||
          (input.kind === "resource" && text(draft, "access") === "registration")
        )
          await checkRegistration(draft);
        if (input.kind === "resource" && text(draft, "assetId")) {
          const asset = await store.asset(text(draft, "assetId"));
          if (!asset || asset.status !== "ready")
            throw new Error("The PDF must pass upload verification before publication.");
        }
        if (input.kind === "blog") {
          const cache = await store.cache();
          if (
            !cache?.last_success_at ||
            Date.now() - Date.parse(cache.last_success_at) > 86400000 ||
            !(cache.payload as KitPost[]).some((p) => p.id === old?.source_ref)
          )
            throw new Error(
              "Sync Kit first; only a verified public, free article can be published.",
            );
        }
        if (input.kind === "popup" && text(draft, "promotionId")) {
          const target = await store.get(text(draft, "promotionId"));
          if (
            !target?.published ||
            target.archived ||
            !["webinar", "resource"].includes(target.kind) ||
            (target.kind === "webinar" && !flag(target.published, "popupEligible"))
          )
            throw new Error(
              "Select a published resource or a webinar enabled for popup promotion.",
            );
        }
      }
      return store.mutate({
        p_actor: actor,
        p_id: input.id,
        p_kind: input.kind,
        p_slug: input.slug,
        p_title: input.title,
        p_draft: draft,
        p_expected: input.expected,
        p_action: input.action,
        ...(input.restore ? { p_restore: input.restore } : {}),
        ...(old?.source_ref ? { p_source_ref: old.source_ref } : {}),
      });
    },
    async publicBundle(): Promise<PublicBundle> {
      try {
        const rows = await store.published();
        let cache = await store.cache();
        if (
          process.env["KIT_API_KEY"] &&
          rows.some((r) => r.kind === "blog") &&
          (!cache?.last_attempt_at || Date.now() - Date.parse(cache.last_attempt_at) > 900000)
        ) {
          try {
            await sync();
            cache = await store.cache();
          } catch {
            /* Bounded stale cache on a temporary Kit failure. */
          }
        }
        const posts =
          cache?.last_success_at &&
          Date.now() - Date.parse(cache.last_success_at) < 86400000 &&
          Array.isArray(cache.payload)
            ? (cache.payload as KitPost[])
            : [];
        const items: PublicItem[] = rows.flatMap((row) => {
          if (row.kind === "page" || !row.published) return [];
          let content = publicContent(row.kind, row.published);
          if (row.kind === "blog") {
            const post = posts.find((p) => p.id === row.source_ref);
            if (!post || !flag(content, "visible")) return [];
            content = {
              ...content,
              title: post.title,
              description: post.summary,
              externalUrl: post.url,
              coverUrl: post.thumbnail,
              coverAlt: post.alt,
              date: post.date,
            };
          }
          return [
            {
              id: row.id,
              kind: row.kind,
              slug: row.slug,
              content,
              revision: row.published_revision,
              date: row.published_at,
            },
          ];
        });
        const liveIds = new Set(items.map((i) => i.id));
        return {
          home: { ...homeDefaults, ...rows.find((r) => r.id === HOME_ID)?.published },
          items: items.filter(
            (i) =>
              i.kind !== "popup" ||
              !text(i.content, "promotionId") ||
              liveIds.has(text(i.content, "promotionId")),
          ),
          blogCheckedAt: cache?.last_success_at ?? null,
          unavailable: false,
        };
      } catch {
        return { home: { ...homeDefaults }, items: [], blogCheckedAt: null, unavailable: true };
      }
    },
    async initUpload(actor: string, filename: string, size: number) {
      await store.requireAdmin(actor);
      if (!/\.pdf$/i.test(filename) || size < 5 || size > 10485760)
        throw new Error("Choose a PDF of at most 10 MB.");
      const id = crypto.randomUUID();
      const path = `${id}/resource.pdf`;
      const result = await store.storage.createSignedUploadUrl(path, { upsert: false });
      if (result.error)
        throw new Error(
          "Private file storage is not configured or the upload could not be authorized.",
        );
      await store.insertAsset({
        id,
        object_path: path,
        filename: filename.replace(/[^\w. -]/g, "_").slice(0, 180),
        byte_size: size,
        status: "pending",
        created_by: actor,
      });
      return { id, path, token: result.data.token };
    },
    async finishUpload(actor: string, id: string) {
      await store.requireAdmin(actor);
      const asset = await store.asset(id);
      if (!asset || asset.created_by !== actor || asset.status !== "pending")
        throw new Error("This pending upload is unavailable.");
      const result = await store.storage.download(asset.object_path);
      if (result.error) throw new Error("Upload not found. Try uploading the PDF again.");
      const blob = result.data;
      const magic = new TextDecoder().decode(await blob.slice(0, 5).arrayBuffer());
      if (
        blob.size !== asset.byte_size ||
        blob.size > 10485760 ||
        blob.type !== "application/pdf" ||
        magic !== "%PDF-"
      ) {
        await store.finishAsset(id, "rejected");
        throw new Error(
          "The uploaded file did not pass PDF type, signature and size verification.",
        );
      }
      await store.finishAsset(id, "ready");
      return { id, filename: asset.filename };
    },
    async assetPreview(actor: string, id: string) {
      await store.requireAdmin(actor);
      const asset = await store.asset(id);
      if (!asset || asset.status !== "ready") throw new Error("Verified PDF unavailable.");
      const result = await store.storage.createSignedUrl(asset.object_path, 60, {
        download: asset.filename,
      });
      if (result.error) throw new Error("Could not create the private PDF preview.");
      return result.data.signedUrl;
    },
    async download(id: string) {
      const document = await store.get(id);
      if (
        document?.kind !== "resource" ||
        document.archived ||
        !document.published ||
        text(document.published, "access") !== "open"
      )
        throw new Error("This resource is not publicly available.");
      const assetId = text(document.published, "assetId");
      if (!assetId) return text(document.published, "externalUrl");
      const asset = await store.asset(assetId);
      if (asset?.status !== "ready") throw new Error("Resource unavailable.");
      const result = await store.storage.createSignedUrl(asset.object_path, 60, {
        download: asset.filename,
      });
      if (result.error) throw new Error("The resource could not be accessed. Please try again.");
      return result.data.signedUrl;
    },
    async event(id: string, key: string, type: string, consent: boolean) {
      if (!consent) return false;
      const rows = await store.published();
      if (!flag(rows.find((r) => r.id === HOME_ID)?.published, "analyticsEnabled")) return false;
      const doc = rows.find((r) => r.id === id);
      if (!doc) return false;
      await store.recordEvent({
        document_id: id,
        event_key: `${id}:${key}:${type}`,
        event_type: type,
      });
      return true;
    },
  };
}
export async function cmsService() {
  return contentService(await cmsStore());
}
