"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { createClient } from "../../lib/supabase/client";

type OrganizationRole = "owner" | "admin" | "manager" | "staff" | "viewer";

type AuthContextValue = {
  loading: boolean;
  userId: string | null;
  organizationId: string | null;
  role: OrganizationRole | null;
  hasRole: (allowed: OrganizationRole[]) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type OrganizationMemberRow = {
  organizationId: string;
  role: OrganizationRole;
};

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [role, setRole] = useState<OrganizationRole | null>(null);

  useEffect(() => {
    const supabase = createClient();

    let mounted = true;
    async function hydrate() {
      const { data: userData } = await supabase.auth.getUser();
      const id = userData.user?.id ?? null;

      if (!mounted) return;
      setUserId(id);

      if (!id) {
        setOrganizationId(null);
        setRole(null);
        setLoading(false);
        return;
      }

      const { data: memberships } = await supabase
        .from("OrganizationMember")
        .select("organizationId,role")
        .eq("userId", id)
        .limit(1)
        .returns<OrganizationMemberRow[]>();

      if (!mounted) return;
      const first = memberships?.[0];
      setOrganizationId(first?.organizationId ?? null);
      setRole(first?.role ?? null);
      setLoading(false);
    }

    void hydrate();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      void hydrate();
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      loading,
      userId,
      organizationId,
      role,
      hasRole: (allowed) => {
        if (!role) return false;
        return allowed.includes(role);
      }
    };
  }, [loading, organizationId, role, userId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
