import { AdminAccess } from "./access";
import { adminNavigation, adminGroups } from "./navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { PanelLeftClose, PanelLeftOpen, Menu, LogOut, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { legacyAdminPath } from "./model";
import { adminButton, Card } from "./ui";
import "./admin.css";

function Navigation({
  isAdmin,
  collapsed = false,
  close,
}: {
  isAdmin: boolean;
  collapsed?: boolean;
  close?: () => void;
}) {
  const pathname = useLocation({ select: (location) => location.pathname }).replace(/\/$/, "");
  return (
    <nav aria-label="Admin pages">
      {adminGroups
        .filter((group) =>
          adminNavigation.some(
            (item) => item.group === group && (!("adminOnly" in item) || isAdmin),
          ),
        )
        .map((group) => (
          <div key={group} className="mb-7">
            <p
              className={
                collapsed
                  ? "sr-only"
                  : "px-3 pb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
              }
            >
              {group}
            </p>
            <ul className="space-y-2">
              {adminNavigation
                .filter((item) => item.group === group && (!("adminOnly" in item) || isAdmin))
                .map((item) => {
                  const active =
                    item.to === "/admin"
                      ? pathname === item.to
                      : pathname === item.to || pathname.startsWith(`${item.to}/`);
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={`admin-nav-link ${active ? "admin-nav-active" : ""} ${collapsed ? "justify-center" : ""}`}
                      >
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
    </nav>
  );
}

export function AdminShell({
  user,
  isAdmin,
  onSignOut,
  children,
}: {
  user: User;
  isAdmin: boolean;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const pathname = useLocation({ select: (location) => location.pathname }).replace(/\/$/, "");
  const title = pathname.startsWith("/admin/assessments/")
    ? "Assessment detail"
    : (adminNavigation.find((item) => item.to === pathname)?.label ?? "Dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(`snapshot-admin-sidebar:${user.id}`) === "collapsed");
    } catch {
      /* Storage may be disabled. */
    }
    setLoaded(true);
  }, [user.id]);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem(
          `snapshot-admin-sidebar:${user.id}`,
          collapsed ? "collapsed" : "expanded",
        );
      } catch {
        /* Preference is optional. */
      }
  }, [collapsed, loaded, user.id]);
  const name =
    typeof user.user_metadata?.["name"] === "string" && user.user_metadata["name"]
      ? user.user_metadata["name"]
      : (user.email ?? "Signed-in staff");
  return (
    <div className={`admin-portal min-h-dvh bg-blush ${collapsed ? "admin-collapsed" : ""}`}>
      <a href="#admin-content" className="admin-skip-link">
        Skip to page content
      </a>
      <aside className="admin-sidebar" aria-label="Workspace sidebar">
        <div className="flex min-h-24 items-center justify-center border-b border-border px-4">
          {collapsed ? (
            <Link
              to="/admin"
              aria-label="Snapshot admin home"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy font-display font-black text-white"
            >
              II<span className="text-lime">.</span>
            </Link>
          ) : (
            <Logo />
          )}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-7">
          <Navigation isAdmin={isAdmin} collapsed={collapsed} />
        </div>
        <div className="space-y-2 border-t border-border p-3">
          <a
            href="/"
            title={collapsed ? "View website" : undefined}
            className={`admin-nav-link ${collapsed ? "justify-center" : ""}`}
          >
            <ArrowUpRight className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className={collapsed ? "sr-only" : ""}>View website</span>
          </a>
          <button
            className={`admin-nav-link w-full ${collapsed ? "justify-center" : ""}`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
            <span className={collapsed ? "sr-only" : ""}>Collapse sidebar</span>
          </button>
        </div>
      </aside>
      <div className="admin-workspace min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/70 bg-card/95 px-4 py-4 backdrop-blur sm:px-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="lg:hidden">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <button className={adminButton} aria-label="Open admin navigation">
                      <Menu className="h-5 w-5" />
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="left"
                    className="admin-portal admin-mobile-nav flex w-[min(88vw,320px)] flex-col"
                  >
                    <SheetTitle>Snapshot admin</SheetTitle>
                    <SheetDescription>Navigate your private workspace.</SheetDescription>
                    <div className="mt-5">
                      <Logo />
                    </div>
                    <div className="mt-7 min-h-0 flex-1 overflow-y-auto">
                      <Navigation isAdmin={isAdmin} close={() => setMobileOpen(false)} />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px]">
                  Iban Ison · Admin portal
                </p>
                <h1 className="text-xl font-black sm:text-2xl">{title}</h1>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden max-w-64 text-right sm:block">
                <p className="truncate text-sm font-bold" title={name}>
                  {name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isAdmin ? "Administrator" : "Staff"}
                </p>
              </div>
              <button className={adminButton} onClick={onSignOut}>
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </button>
            </div>
          </div>
        </header>
        <main
          id="admin-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1500px] p-4 outline-none sm:p-7 lg:p-9"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AdminLayout({ user }: { user: User }) {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const location = useLocation();
  const [signOutError, setSignOutError] = useState("");
  const access = useQuery({
    queryKey: ["admin", "access", user.id],
    staleTime: 30_000,
    refetchInterval: (query) =>
      query.state.data?.some((role) => role === "admin" || role === "staff") ? false : 10_000,
    queryFn: async () => {
      const result = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (result.error) throw result.error;
      return result.data.map((row) => row.role);
    },
  });
  useEffect(() => {
    if (location.pathname.replace(/\/$/, "") !== "/admin") return;
    const destination = legacyAdminPath(
      location.hash.startsWith("#") ? location.hash : `#${location.hash}`,
    );
    if (destination) void navigate({ to: destination, replace: true });
  }, [location.pathname, location.hash, navigate]);
  const signOut = async () => {
    setSignOutError("");
    await cache.cancelQueries();
    const result = await supabase.auth.signOut();
    if (result.error) {
      setSignOutError("Sign-out failed. Please try again.");
      return;
    }
    cache.clear();
    void navigate({ to: "/auth", replace: true });
  };
  const allowed =
    !access.error && access.data?.some((role) => role === "admin" || role === "staff");
  if (!allowed)
    return (
      <div className="admin-portal min-h-dvh bg-blush p-5">
        <div className="mx-auto max-w-2xl py-12">
          <Logo />
          <Card className="mt-8">
            <h1 className="text-2xl font-black">
              {access.isPending
                ? "Checking staff access…"
                : access.error
                  ? "We couldn’t verify access"
                  : "Staff access is pending"}
            </h1>
            <p className="mt-3 break-all text-sm text-muted-foreground">
              Signed in as {user.email}. An account alone does not grant access to private records.
            </p>
            <p className="mt-3 text-sm">
              {access.error
                ? "Check your connection and try again."
                : "An administrator must grant your account a staff or administrator role. Access is checked every 10 seconds while you wait."}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                className={adminButton}
                disabled={access.isFetching}
                onClick={() => void access.refetch()}
              >
                Check access
              </button>
              <button className={adminButton} onClick={() => void signOut()}>
                Sign out
              </button>
            </div>
            {signOutError && (
              <p role="alert" className="mt-3 text-destructive">
                {signOutError}
              </p>
            )}
          </Card>
        </div>
      </div>
    );
  const isAdmin = access.data?.includes("admin") ?? false;
  return (
    <AdminAccess.Provider value={{ user, isAdmin }}>
      <AdminShell user={user} isAdmin={isAdmin} onSignOut={() => void signOut()}>
        {signOutError && (
          <p role="alert" className="mb-4 text-destructive">
            {signOutError}
          </p>
        )}
        <Outlet />
      </AdminShell>
    </AdminAccess.Provider>
  );
}
