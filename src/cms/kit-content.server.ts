import { safeHref } from "./content.ts";
export interface KitPost {
  id: string;
  title: string;
  summary: string;
  url: string;
  date: string;
  thumbnail: string;
  alt: string;
}
export interface KitForm {
  id: number;
  embed_url: string;
  archived: boolean;
}
type Page = {
  posts?: unknown[];
  forms?: KitForm[];
  pagination?: { has_next_page?: boolean; end_cursor?: string };
};
const clean = (value: unknown, max: number) =>
  typeof value === "string"
    ? value
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";
export function eligiblePosts(rows: unknown[], now = Date.now()): KitPost[] {
  return rows.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const p = value as Record<string, unknown>;
    const date = typeof p["published_at"] === "string" ? p["published_at"] : "";
    const url = typeof p["public_url"] === "string" ? p["public_url"] : "";
    if (
      p["status"] !== "published" ||
      p["is_paid"] !== false ||
      !date ||
      !Number.isFinite(Date.parse(date)) ||
      Date.parse(date) > now ||
      !safeHref(url, true) ||
      typeof p["id"] !== "number" ||
      !Number.isSafeInteger(p["id"]) ||
      Number(p["id"]) <= 0 ||
      !clean(p["title"], 200)
    )
      return [];
    const thumb = typeof p["thumbnail_url"] === "string" ? p["thumbnail_url"] : "";
    return [
      {
        id: String(p["id"]),
        title: clean(p["title"], 200),
        summary: clean(p["description"] ?? p["meta_description"], 500),
        url,
        date,
        thumbnail: safeHref(thumb, true) ? thumb : "",
        alt: clean(p["thumbnail_alt"], 180),
      },
    ];
  });
}
export function kitContentClient(key = process.env["KIT_API_KEY"], request: typeof fetch = fetch) {
  async function list(endpoint: "posts" | "forms") {
    if (!key)
      throw new Error(
        "Configure the server-only KIT_API_KEY to connect Kit articles and delivery forms.",
      );
    const rows: unknown[] = [];
    let cursor = "";
    const cursors = new Set<string>();
    for (let page = 0; page < 100; page++) {
      const url = new URL(`https://api.kit.com/v4/${endpoint}`);
      url.searchParams.set("per_page", "500");
      if (cursor) url.searchParams.set("after", cursor);
      let response: Response;
      try {
        response = await request(url, {
          headers: { "X-Kit-Api-Key": key },
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        throw new Error(
          "Kit could not be reached within five seconds. Last successful articles are retained temporarily.",
        );
      }
      if (!response.ok)
        throw new Error(
          `Kit connection failed (HTTP ${response.status}). Check API access and try again.`,
        );
      const data = (await response.json()) as Page;
      const items = data[endpoint];
      if (!Array.isArray(items))
        throw new Error(
          "Kit returned an unexpected response. The previous cache has been retained.",
        );
      rows.push(...items);
      if (!data.pagination?.has_next_page) return rows;
      const next = data.pagination.end_cursor;
      if (!next || cursors.has(next))
        throw new Error("Kit pagination did not advance. No partial sync was saved.");
      cursors.add(next);
      cursor = next;
    }
    throw new Error("Kit pagination limit reached. No partial sync was saved.");
  }
  return {
    posts: async () => eligiblePosts(await list("posts")),
    forms: async () => (await list("forms")) as KitForm[],
  };
}
