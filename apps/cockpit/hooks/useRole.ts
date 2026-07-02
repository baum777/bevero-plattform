import { useAuth } from "../app/providers/auth-provider";

export type UserRole = "owner" | "admin" | "manager" | "staff" | "viewer";

const ROLES: UserRole[] = ["owner", "admin", "manager", "staff", "viewer"];

/**
 * Current organization role from the auth session. Falls back to "staff" for
 * unknown/loading values — the safest default since it reveals the least.
 */
export function useRole(): UserRole {
  const { role } = useAuth();
  return role && ROLES.includes(role) ? role : "staff";
}
