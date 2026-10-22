import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Mail,
  ShieldCheck,
  FileText,
  BookOpen,
  Video,
  Presentation,
  Download,
  Megaphone,
} from "lucide-react";

export const adminGroups = [
  "Overview",
  "Snapshot workspace",
  "Website content",
  "Administration",
] as const;
export const adminNavigation = [
  { to: "/admin", label: "Dashboard", group: "Overview", icon: LayoutDashboard },
  { to: "/admin/leads", label: "Leads", group: "Snapshot workspace", icon: Users },
  {
    to: "/admin/assessments",
    label: "Assessments",
    group: "Snapshot workspace",
    icon: ClipboardList,
  },
  { to: "/admin/email-journeys", label: "Email Journeys", group: "Snapshot workspace", icon: Mail },
  { to: "/admin/pages", label: "Pages", group: "Website content", icon: FileText, adminOnly: true },
  { to: "/admin/blog", label: "Blog", group: "Website content", icon: BookOpen, adminOnly: true },
  { to: "/admin/videos", label: "Videos", group: "Website content", icon: Video, adminOnly: true },
  {
    to: "/admin/webinars",
    label: "Webinars",
    group: "Website content",
    icon: Presentation,
    adminOnly: true,
  },
  {
    to: "/admin/resources",
    label: "Resources",
    group: "Website content",
    icon: Download,
    adminOnly: true,
  },
  {
    to: "/admin/popups",
    label: "Popups",
    group: "Website content",
    icon: Megaphone,
    adminOnly: true,
  },
  {
    to: "/admin/staff",
    label: "Staff Accounts",
    group: "Administration",
    icon: ShieldCheck,
    adminOnly: true,
  },
] as const;
