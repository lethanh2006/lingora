import type { UserRole } from "@/features/user/types";

export function isAdmin(role: UserRole) {
  return role === "admin";
}

export function canManageContent(role: UserRole) {
  return isAdmin(role);
}
