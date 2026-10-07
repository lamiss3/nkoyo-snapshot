import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";

type AccountDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables" | "Functions"> & {
    Tables: Database["public"]["Tables"] & {
      staff_account_events: {
        Row: {
          id: string;
          actor_id: string;
          target_id: string | null;
          email: string;
          event_type: string;
          created_at: string;
        };
        Insert: { actor_id: string; target_id?: string; email: string; event_type: string };
        Update: never;
        Relationships: [];
      };
      staff_account_deletions: {
        Row: {
          target_id: string;
          email: string;
          requested_by: string;
          status: "pending" | "failed" | "deleted";
          requested_at: string;
          completed_at: string | null;
        };
        Insert: never;
        Update: { status?: "pending" | "failed" | "deleted"; completed_at?: string };
        Relationships: [];
      };
    };
    Functions: Database["public"]["Functions"] & {
      begin_staff_account_deletion: {
        Args: { p_actor: string; p_target: string; p_email: string };
        Returns: undefined;
      };
      grant_new_staff_account: {
        Args: { p_actor: string; p_target: string; p_email: string };
        Returns: undefined;
      };
    };
  };
};

export type StaffAccount = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff";
  createdAt: string | null;
  lastSignInAt: string | null;
  status: "active" | "banned" | "deletion_pending";
};
export function createStaffAccountService(client: SupabaseClient<AccountDatabase>) {
  const requireAdmin = async (actorId: string) => {
    const roles = await client.from("user_roles").select("role").eq("user_id", actorId);
    if (roles.error || !roles.data?.some((role) => role.role === "admin"))
      throw new Error("Administrator access is required.");
  };
  const audit = async (actorId: string, targetId: string, email: string, eventType: string) => {
    const result = await client
      .from("staff_account_events")
      .insert({ actor_id: actorId, target_id: targetId, email, event_type: eventType });
    if (result.error) throw new Error("Could not save staff account history.");
  };
  return {
    async list(actorId: string): Promise<StaffAccount[]> {
      await requireAdmin(actorId);
      const roles = await client.from("user_roles").select("user_id,role");
      const deletions = await client
        .from("staff_account_deletions")
        .select("*")
        .in("status", ["pending", "failed"]);
      if (roles.error || deletions.error) throw new Error("Could not load staff accounts.");
      const byId = new Map<string, "admin" | "staff">();
      for (const row of roles.data ?? [])
        if (row.role === "admin" || !byId.has(row.user_id)) byId.set(row.user_id, row.role);
      const accounts: StaffAccount[] = [];
      // Read only users with staff/admin access, never expose unrelated Auth records.
      for (const [id, role] of byId) {
        const { data, error } = await client.auth.admin.getUserById(id);
        if (error || !data.user) throw new Error("Could not read a staff account.");
        const user = data.user;
        accounts.push({
          id,
          email: user.email ?? "",
          name: typeof user.user_metadata?.["name"] === "string" ? user.user_metadata["name"] : "",
          role,
          createdAt: user.created_at,
          lastSignInAt: user.last_sign_in_at ?? null,
          status:
            user.banned_until && Date.parse(user.banned_until) > Date.now() ? "banned" : "active",
        });
      }
      for (const row of deletions.data ?? [])
        accounts.push({
          id: row.target_id,
          email: row.email,
          name: "",
          role: "staff",
          createdAt: row.requested_at,
          lastSignInAt: null,
          status: "deletion_pending",
        });
      return accounts.sort((a, b) => a.email.localeCompare(b.email));
    },
    async create(actorId: string, input: { email: string; name: string }) {
      await requireAdmin(actorId);
      const password = "Nk!" + randomBytes(18).toString("base64url") + "7a";
      const { data, error } = await client.auth.admin.createUser({
        email: input.email,
        password,
        email_confirm: true,
        user_metadata: { name: input.name },
      });
      if (error || !data.user)
        throw new Error(
          "Could not create this account. Check whether the email already has an account.",
        );
      const id = data.user.id;
      const role = await client.rpc("grant_new_staff_account", {
        p_actor: actorId,
        p_target: id,
        p_email: input.email,
      });
      if (role.error) {
        await client.auth.admin.deleteUser(id);
        throw new Error("Account setup failed. No staff access was granted.");
      }
      // Return once to the administrator; passwords are never stored in our tables or logs.
      return { id, email: input.email, password };
    },
    async remove(actorId: string, input: { id: string; confirmEmail: string }) {
      await requireAdmin(actorId);
      if (input.id === actorId) throw new Error("You cannot delete your own account.");
      const claimed = await client.rpc("begin_staff_account_deletion", {
        p_actor: actorId,
        p_target: input.id,
        p_email: input.confirmEmail,
      });
      if (claimed.error)
        throw new Error(
          "Deletion was not authorized. Check the email, account and administrator protection.",
        );
      const result = await client.auth.admin.deleteUser(input.id);
      if (result.error && result.error.code !== "user_not_found") {
        await client
          .from("staff_account_deletions")
          .update({ status: "failed" })
          .eq("target_id", input.id);
        await audit(
          actorId,
          input.id,
          input.confirmEmail,
          "auth_deletion_failed_access_remains_revoked",
        );
        throw new Error("Dashboard access was removed, but account deletion needs a retry.");
      }
      const saved = await client
        .from("staff_account_deletions")
        .update({ status: "deleted", completed_at: new Date().toISOString() })
        .eq("target_id", input.id);
      if (saved.error)
        throw new Error("The account was deleted. Its saved deletion status needs a retry.");
      await audit(actorId, input.id, input.confirmEmail, "staff_deleted");
      return { deleted: true };
    },
  };
}
export async function staffAccountService() {
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  return createStaffAccountService(supabaseAdmin as unknown as SupabaseClient<AccountDatabase>);
}
