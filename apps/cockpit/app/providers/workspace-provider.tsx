"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { createClient } from "../../lib/supabase/client";
import { apiFetch, readApiJson } from "../../lib/backend/api-fetch";
import { useAuth } from "./auth-provider";

export type WorkspaceGroupType = "kitchen_storage" | "bar_service" | "admin";

export type WorkspaceGroup = {
  id: string;
  locationId: string;
  name: string;
  slug: string;
  type: WorkspaceGroupType;
  isActive: boolean;
};

type WorkspaceContextValue = {
  loading: boolean;
  groups: WorkspaceGroup[];
  activeGroupId: string | null;
  activeGroupType: WorkspaceGroupType | null;
  setActiveGroup: (id: string) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const STORAGE_KEY = "bevero.activeWorkspaceGroup";
const LOCATION_ID = process.env.NEXT_PUBLIC_ACTIVE_LOCATION_ID ?? "loc-motorworld-boeblingen";
const OVERRIDE_TYPE = process.env.NEXT_PUBLIC_WORKSPACE_GROUP_OVERRIDE as WorkspaceGroupType | undefined;

const DEV_GROUPS: WorkspaceGroup[] = OVERRIDE_TYPE
  ? [
      {
        id: "wg-override-bar",
        locationId: LOCATION_ID,
        name: "Bar & Service",
        slug: "bar-service",
        type: "bar_service",
        isActive: true
      },
      {
        id: "wg-override-kitchen",
        locationId: LOCATION_ID,
        name: "Küche & Lager",
        slug: "kitchen-storage",
        type: "kitchen_storage",
        isActive: true
      }
    ]
  : [];

type WorkspaceProviderProps = {
  children: ReactNode;
};

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { organizationId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        let fetched: WorkspaceGroup[] = DEV_GROUPS;

        if (fetched.length === 0) {
          const supabase = createClient();
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (!token || !organizationId || !mounted) return;

          const res = await apiFetch(`/workspace-groups?location_id=${LOCATION_ID}`, {
            accessToken: token,
            organizationId,
            requireOrganization: true,
            throwOnError: false
          });

          if (!res.ok || !mounted) return;

          const body = (await readApiJson(res)) as { groups: WorkspaceGroup[] };
          fetched = body.groups ?? [];
        }

        if (!mounted) return;
        setGroups(fetched);

        const stored = localStorage.getItem(STORAGE_KEY);
        const stillValid = fetched.find((g) => g.id === stored);
        if (stillValid) {
          setActiveGroupId(stillValid.id);
        } else if (fetched.length > 0) {
          setActiveGroupId(fetched[0].id);
          localStorage.setItem(STORAGE_KEY, fetched[0].id);
        }
      } catch {
        // Non-fatal: app works without workspace groups
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void load();
    return () => { mounted = false; };
  }, [organizationId]);

  const setActiveGroup = useCallback((id: string) => {
    setActiveGroupId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const activeGroupType = useMemo<WorkspaceGroupType | null>(() => {
    return groups.find((g) => g.id === activeGroupId)?.type ?? null;
  }, [groups, activeGroupId]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({ loading, groups, activeGroupId, activeGroupType, setActiveGroup }),
    [loading, groups, activeGroupId, activeGroupType, setActiveGroup]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
