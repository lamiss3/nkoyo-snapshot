import { createFileRoute } from "@tanstack/react-router";
import { LeadsPage } from "@/admin/LeadsPage";
export const Route = createFileRoute("/_authenticated/admin/leads")({ component: LeadsPage });
