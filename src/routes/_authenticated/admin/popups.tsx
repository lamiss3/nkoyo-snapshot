import { createFileRoute } from "@tanstack/react-router";
import { ContentManager } from "@/cms/ContentManager";
export const Route = createFileRoute("/_authenticated/admin/popups")({
  component: () => <ContentManager kind="popup" />,
});
