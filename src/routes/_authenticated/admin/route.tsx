import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/admin/AdminLayout";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin portal | Iban Ison Solutions" },
      { name: "description", content: "Private Snapshot administration portal." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRoute,
});
function AdminRoute() {
  return <AdminLayout user={Route.useRouteContext().user} />;
}
