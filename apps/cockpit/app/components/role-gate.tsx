"use client";

import type { ReactNode } from "react";
import { useAuth } from "../providers/auth-provider";

type OrganizationRole = "owner" | "admin" | "manager" | "staff" | "viewer";

type RoleGateProps = {
  allowed: OrganizationRole[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function RoleGate({ allowed, children, fallback = null }: RoleGateProps) {
  const { hasRole, loading } = useAuth();

  if (loading) return null;
  if (!hasRole(allowed)) return <>{fallback}</>;
  return <>{children}</>;
}
