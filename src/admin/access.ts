import { createContext, useContext } from "react";
import type { User } from "@supabase/supabase-js";

export const AdminAccess = createContext<{ user: User; isAdmin: boolean } | null>(null);
export function useAdminAccess() {
  const value = useContext(AdminAccess);
  if (!value) throw new Error("Admin access context is required.");
  return value;
}
