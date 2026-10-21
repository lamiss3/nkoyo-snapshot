import { LayoutDashboard, Users, ClipboardList, Mail, ShieldCheck } from "lucide-react";

// A single navigation group; future Website Content pages can add a separate group here.
export const adminNavigation = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/leads", label: "Leads", icon: Users },
  { to: "/admin/assessments", label: "Assessments", icon: ClipboardList },
  { to: "/admin/email-journeys", label: "Email Journeys", icon: Mail },
  { to: "/admin/staff", label: "Staff Accounts", icon: ShieldCheck, adminOnly: true },
] as const;
