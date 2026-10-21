import { createFileRoute } from "@tanstack/react-router";
import { EmailJourneyPanel } from "@/components/snapshot/EmailJourneyPanel";
export const Route = createFileRoute("/_authenticated/admin/email-journeys")({
  component: EmailJourneyPanel,
});
