import { createFileRoute } from "@tanstack/react-router";
import { publicWebsite } from "@/cms/actions";
import { HomepageView } from "@/cms/HomepageView";
import { FeaturedContent, MarketingFeatures } from "@/cms/PublicViews";
import { text, flag } from "@/cms/content";
export const Route = createFileRoute("/")({
  loader: () => publicWebsite(),
  head: ({ loaderData }) => ({
    meta: [
      { title: text(loaderData?.home, "seoTitle") },
      { name: "description", content: text(loaderData?.home, "seoDescription") },
      { property: "og:title", content: text(loaderData?.home, "ogTitle") },
      { property: "og:description", content: text(loaderData?.home, "ogDescription") },
    ],
  }),
  component: LandingPage,
});
function LandingPage() {
  const bundle = Route.useLoaderData();
  return (
    <>
      <HomepageView content={bundle.home}>
        {flag(bundle.home, "featuredVisible") && <FeaturedContent items={bundle.items} />}
      </HomepageView>
      <MarketingFeatures bundle={bundle} path="/" />
    </>
  );
}
