import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";
import { kinds, homeDefaults, type Content } from "./content";
async function service() {
  return (await import("./service.server")).cmsService();
}
async function result<T>(work: () => Promise<T>) {
  try {
    return { ok: true as const, value: await work() };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Content operation failed. No success was confirmed.",
    };
  }
}
export const listContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({ kind: z.enum(kinds) })
      .strict()
      .parse(data),
  )
  .handler(async ({ context, data }) =>
    result(async () => (await service()).list(context.userId, data.kind)),
  );
export const contentHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ context, data }) =>
    result(async () => (await service()).history(context.userId, data.id)),
  );
export const changeContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        kind: z.enum(kinds),
        slug: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .max(80),
        title: z.string().trim().min(1).max(160),
        draft: z.record(
          z.union([
            z.string(),
            z.number(),
            z.boolean(),
            z.array(z.string()),
            z.array(z.object({ label: z.string(), href: z.string() }).strict()),
          ]),
        ),
        expected: z.number().int().min(0),
        action: z.enum(["save", "publish", "unpublish", "archive", "restore"]),
        restore: z.string().uuid().optional(),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ context, data }) =>
    result(async () =>
      (await service()).mutate(context.userId, { ...data, draft: data.draft as Content }),
    ),
  );
export const syncArticles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => result(async () => (await service()).sync(context.userId)));
export const beginPdfUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z
      .object({ filename: z.string().max(255), size: z.number().int().positive().max(10485760) })
      .strict()
      .parse(data),
  )
  .handler(async ({ context, data }) =>
    result(async () => (await service()).initUpload(context.userId, data.filename, data.size)),
  );
export const finishPdfUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ context, data }) =>
    result(async () => (await service()).finishUpload(context.userId, data.id)),
  );
export const previewPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ context, data }) =>
    result(async () => (await service()).assetPreview(context.userId, data.id)),
  );
export const publicWebsite = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await (await service()).publicBundle();
  } catch {
    return { home: { ...homeDefaults }, items: [], blogCheckedAt: null, unavailable: true };
  }
});
export const resourceDownload = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ id: z.string().uuid() }).strict().parse(data))
  .handler(async ({ data }) => result(async () => (await service()).download(data.id)));
export const contentEvent = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        key: z.string().uuid(),
        type: z.enum([
          "cta_click",
          "resource_access",
          "registration_form_opened",
          "popup_impression",
          "popup_dismissal",
          "popup_click",
        ]),
        consent: z.literal(true),
      })
      .strict()
      .parse(data),
  )
  .handler(async ({ data }) =>
    result(async () => (await service()).event(data.id, data.key, data.type, data.consent)),
  );
