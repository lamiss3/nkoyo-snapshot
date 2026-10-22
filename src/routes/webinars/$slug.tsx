import { createFileRoute, notFound } from "@tanstack/react-router";
import { publicWebsite } from "@/cms/actions";
import { DetailPage } from "@/cms/PublicViews";
import { text } from "@/cms/content";
export const Route = createFileRoute("/webinars/$slug")({
  loader: async ({ params }) => {
    const bundle = await publicWebsite();
    if (!bundle.items.some((i) => i.kind === "webinar" && i.slug === params.slug)) throw notFound();
    return bundle;
  },
  head: ({ loaderData, params }) => {
    const c = loaderData?.items.find(
      (i) => i.kind === "webinar" && i.slug === params.slug,
    )?.content;
    return {
      meta: [
        {
          title:
            (text(c, "seoTitle") || text(c, "title") || "Unavailable") + " | Iban Ison Solutions",
        },
        { name: "description", content: text(c, "seoDescription") || text(c, "description") },
      ],
    };
  },
  component: Page,
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl p-10">
      <h1 className="text-3xl font-black">Item not available</h1>
      <p className="mt-4">This item may be a draft or archived.</p>
      <a href="/webinars" className="snapshot-cta mt-6">
        Browse webinars
      </a>
    </main>
  ),
});
function Page() {
  return <DetailPage bundle={Route.useLoaderData()} kind="webinar" slug={Route.useParams().slug} />;
}
