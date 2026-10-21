import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/admin/DashboardPage";
export const Route = createFileRoute("/_authenticated/admin/")({ component: DashboardPage });
