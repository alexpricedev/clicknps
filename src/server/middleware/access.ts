import type { AuthContext } from "./auth";

export type UserRole = "owner" | "admin" | "member";

export function isAdminOrOwner(auth: AuthContext): boolean {
  const userRole = auth?.user?.role;
  return userRole === "owner" || userRole === "admin";
}

export function isOwner(auth: AuthContext): boolean {
  return auth?.user?.role === "owner";
}

export function isMember(auth: AuthContext): boolean {
  return auth?.user?.role === "member";
}
