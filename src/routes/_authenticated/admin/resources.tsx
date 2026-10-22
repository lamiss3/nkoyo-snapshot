import { createFileRoute } from "@tanstack/react-router";
import { ContentManager } from "@/cms/ContentManager";
export const Route = createFileRoute("/_authenticated/admin/resources")({
  component: () => <ContentManager kind="resource" />,
});
