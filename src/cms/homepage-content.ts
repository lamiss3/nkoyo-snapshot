import { flag, order } from "./content.ts";
import type { PublicItem } from "./service.server.ts";

// Receives only the public bundle; homepage opt-outs and empty categories stay hidden.
const sortHomepageItems = (items: PublicItem[]) =>
  [...items].sort(
    (a, b) =>
      Number(flag(b.content, "featured")) - Number(flag(a.content, "featured")) ||
      order(a.content) - order(b.content) ||
      (b.date ?? "").localeCompare(a.date ?? ""),
  );

export function homepageContentGroups(items: PublicItem[]) {
  return (
    [
      { kind: "blog", label: "From the blog", path: "/insights", limit: 3 },
      { kind: "video", label: "Videos", path: "/videos", limit: 3 },
      { kind: "webinar", label: "Webinars", path: "/webinars", limit: 1 },
      { kind: "resource", label: "Free resources", path: "/resources", limit: 4 },
    ] as const
  )
    .map((group) => ({
      ...group,
      items: sortHomepageItems(items)
        .filter(
          (item) =>
            item.kind === group.kind && (item.kind === "blog" || flag(item.content, "homepage")),
        )
        .slice(0, group.limit),
    }))
    .filter((group) => group.items.length > 0);
}
