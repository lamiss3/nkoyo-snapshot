import { createFileRoute } from "@tanstack/react-router";
import { publicWebsite } from "@/cms/actions";
import { ContentLibrary } from "@/cms/PublicViews";
export const Route = createFileRoute("/insights/")({
  loader: () => publicWebsite(),
  head: () => ({ meta: [{ title: "Insights | Iban Ison Solutions" }] }),
  component: Page,
});
function Page() {
  return <ContentLibrary bundle={Route.useLoaderData()} kind="blog" />;
}
