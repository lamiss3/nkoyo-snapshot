import { createFileRoute } from "@tanstack/react-router";
import { publicWebsite } from "@/cms/actions";
import { ContentLibrary } from "@/cms/PublicViews";
export const Route = createFileRoute("/resources/")({
  loader: () => publicWebsite(),
  head: () => ({ meta: [{ title: "Resources | Iban Ison Solutions" }] }),
  component: Page,
});
function Page() {
  return <ContentLibrary bundle={Route.useLoaderData()} kind="resource" />;
}
