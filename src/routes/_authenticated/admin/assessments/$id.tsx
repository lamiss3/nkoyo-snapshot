import { createFileRoute } from "@tanstack/react-router";
import { AssessmentDetailPage } from "@/admin/AssessmentDetailPage";
export const Route = createFileRoute("/_authenticated/admin/assessments/$id")({
  component: AssessmentRoute,
});
function AssessmentRoute() {
  return <AssessmentDetailPage id={Route.useParams().id} />;
}
