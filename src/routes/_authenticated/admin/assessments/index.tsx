import { createFileRoute } from "@tanstack/react-router";
import { AssessmentsPage } from "@/admin/AssessmentsPage";
export const Route = createFileRoute("/_authenticated/admin/assessments/")({
  component: AssessmentsPage,
});
