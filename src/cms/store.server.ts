import type { KitPost } from "./kit-content.server.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContentDocument, ContentVersion, ContentKind } from "./content.ts";
export type Asset = {
  id: string;
  object_path: string;
  filename: string;
  byte_size: number;
  status: "pending" | "ready" | "rejected";
  created_by: string;
};
export type IntegrationCache = {
  key: string;
  payload: KitPost[];
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
};

// Separate CMS tables are typed here, matching the additive 0005 migration.
type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };
export type CmsDatabase = {
  public: {
    Tables: {
      website_documents: Table<ContentDocument>;
      website_versions: Table<ContentVersion>;
      website_assets: Table<Asset>;
      website_integrations: Table<IntegrationCache>;
      website_content_events: Table<{
        id: string;
        document_id: string;
        event_key: string;
        event_type: string;
        created_at: string;
      }>;
      user_roles: Table<{ user_id: string; role: string }>;
    };
    Views: Record<string, never>;
    Functions: {
      website_mutate_document: {
        Args: {
          p_actor: string;
          p_id: string;
          p_kind: string;
          p_slug: string;
          p_title: string;
          p_draft: unknown;
          p_expected: number;
          p_action: string;
          p_restore?: string;
          p_source_ref?: string;
        };
        Returns: ContentDocument;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
export class CmsSetupError extends Error {
  constructor() {
    super(
      "Website Content setup is required: apply drizzle/migrations/0005_website_content_management.sql in the correct Supabase project.",
    );
  }
}
function checked<T>(result: { data: T; error: { code?: string; message: string } | null }): T {
  if (result.error) {
    if (["42P01", "PGRST205", "PGRST202"].includes(result.error.code ?? ""))
      throw new CmsSetupError();
    throw new Error(
      result.error.message.includes("duplicate key")
        ? "That slug is in use, or another webinar is already featured. Choose a different slug or unfeature the current webinar first."
        : result.error.message,
    );
  }
  return result.data;
}
async function pages<T>(
  fetchPage: (
    start: number,
    end: number,
  ) => PromiseLike<{ data: T[] | null; error: { code?: string; message: string } | null }>,
) {
  const all: T[] = [];
  for (let start = 0; ; start += 500) {
    const data = checked(await fetchPage(start, start + 499)) ?? [];
    all.push(...data);
    if (data.length < 500) return all;
  }
}
export function createCmsStore(client: SupabaseClient<CmsDatabase>) {
  return {
    async requireAdmin(actor: string) {
      const data = checked(await client.from("user_roles").select("role").eq("user_id", actor));
      if (!data?.some((row) => row.role === "admin"))
        throw new Error("Administrator access is required for Website Content.");
    },
    async list(kind: ContentKind) {
      return pages((a, b) =>
        client
          .from("website_documents")
          .select("*")
          .eq("kind", kind)
          .order("updated_at", { ascending: false })
          .order("id")
          .range(a, b),
      );
    },
    async get(id: string) {
      return checked(await client.from("website_documents").select("*").eq("id", id).maybeSingle());
    },
    async published() {
      return pages((a, b) =>
        client
          .from("website_documents")
          .select("id,kind,slug,published,published_at,published_revision,source_ref")
          .eq("archived", false)
          .not("published", "is", null)
          .order("id")
          .range(a, b),
      );
    },
    async versions(id: string) {
      return pages((a, b) =>
        client
          .from("website_versions")
          .select("*")
          .eq("document_id", id)
          .order("created_at", { ascending: false })
          .order("id")
          .range(a, b),
      );
    },
    async mutate(args: CmsDatabase["public"]["Functions"]["website_mutate_document"]["Args"]) {
      const row = checked(await client.rpc("website_mutate_document", args));
      if (!row) throw new Error("The content change was not confirmed.");
      return row;
    },
    async asset(id: string) {
      return checked(await client.from("website_assets").select("*").eq("id", id).maybeSingle());
    },
    async insertAsset(row: Asset) {
      checked(await client.from("website_assets").insert(row));
    },
    async finishAsset(id: string, status: "ready" | "rejected") {
      checked(await client.from("website_assets").update({ status }).eq("id", id));
    },
    async cache() {
      return checked(
        await client.from("website_integrations").select("*").eq("key", "kit_posts").maybeSingle(),
      );
    },
    async saveCache(row: IntegrationCache) {
      checked(await client.from("website_integrations").upsert(row, { onConflict: "key" }));
    },
    async recordEvent(row: { document_id: string; event_key: string; event_type: string }) {
      checked(
        await client
          .from("website_content_events")
          .upsert(row, { onConflict: "event_key", ignoreDuplicates: true }),
      );
    },
    async eventCounts(id: string) {
      const rows = await pages((a, b) =>
        client
          .from("website_content_events")
          .select("event_type")
          .eq("document_id", id)
          .order("id")
          .range(a, b),
      );
      const counts: Record<string, number> = {};
      for (const row of rows) counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
      return counts;
    },
    storage: client.storage.from("website-resources"),
  };
}
export type CmsStore = ReturnType<typeof createCmsStore>;
export async function cmsStore() {
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  return createCmsStore(supabaseAdmin as unknown as SupabaseClient<CmsDatabase>);
}
