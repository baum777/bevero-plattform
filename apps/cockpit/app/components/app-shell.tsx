"use client";

import { type ReactNode, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../providers/auth-provider";
import { useWorkspace } from "../providers/workspace-provider";
import { useTheme } from "../../hooks/useTheme";
import { BottomNav } from "./bottom-nav";
import { QuickNotesFab } from "./quick-notes-fab";
import { getConfiguredBackendApiBaseLabel } from "../../lib/backend/api-base";
import { createClient } from "../../lib/supabase/client";
import type { Role } from "../../lib/auth/rbac";

function SunIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

type NavItem = {
  label: string;
  href: string;
  allowed?: Role[];
};

type NavGroup = {
  label?: string;
  items: NavItem[];
};

const ALL: Role[] = ["owner", "admin", "manager", "staff", "viewer"];
const MANAGER_UP: Role[] = ["owner", "admin", "manager"];
const ADMIN_UP: Role[] = ["owner", "admin"];

const kitchenNavGroups: NavGroup[] = [
  {
    items: [
      { label: "Heute", href: "/heute", allowed: ALL },
      { label: "Dashboard", href: "/dashboard", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Küche & Lager",
    items: [
      { label: "Checkliste", href: "/kitchen/checkliste", allowed: ALL },
      { label: "Walk-Route", href: "/kitchen/walk-route", allowed: ALL },
      { label: "Artikel", href: "/inventory/items", allowed: MANAGER_UP },
      { label: "Bestände", href: "/inventory/balances", allowed: MANAGER_UP },
      { label: "Warenbewegungen", href: "/movements", allowed: ALL },
      { label: "Wareneingang", href: "/inventory/goods-receipt", allowed: ALL },
      { label: "Lagerorte", href: "/storage", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Schichtplanung",
    items: [
      { label: "Meine Aufgaben", href: "/schichtplan/heute", allowed: ALL },
      { label: "Schicht-Übersicht", href: "/schichtplan/uebersicht", allowed: MANAGER_UP },
      { label: "Mängel", href: "/schichtplan/maengel", allowed: MANAGER_UP },
      { label: "Schichtabschluss", href: "/schichtplan/abschluss", allowed: MANAGER_UP },
      { label: "Import", href: "/schichtplan/import", allowed: MANAGER_UP },
      { label: "Matrix", href: "/schichtplan/matrix", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Operative Ebene",
    items: [
      { label: "Notizen", href: "/notes", allowed: ALL },
      { label: "Freigaben", href: "/freigaben", allowed: MANAGER_UP },
      { label: "Alerts", href: "/alerts", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Einstellungen",
    items: [
      { label: "Profil", href: "/settings/profile", allowed: ALL },
      { label: "Team", href: "/settings/team", allowed: ADMIN_UP },
      { label: "Rollen", href: "/settings/roles", allowed: ADMIN_UP }
    ]
  }
];

const navGroups: NavGroup[] = [
  {
    items: [
      { label: "Heute", href: "/heute", allowed: ALL },
      { label: "Dashboard", href: "/dashboard", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Warenfluss",
    items: [
      { label: "Warenbewegungen", href: "/movements", allowed: ALL },
      { label: "Auffüllliste Bar", href: "/inventory/bar-refill", allowed: ALL }
    ]
  },
  {
    label: "Inventar",
    items: [
      { label: "Artikel", href: "/inventory/items", allowed: MANAGER_UP },
      { label: "Bestände", href: "/inventory/balances", allowed: MANAGER_UP },
      { label: "Einkauf (FoodNotify)", href: "/procurement", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Struktur",
    items: [
      { label: "Arbeitsbereiche", href: "/workspaces", allowed: MANAGER_UP },
      { label: "Lagerorte", href: "/storage", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Operative Ebene",
    items: [
      { label: "Notizen", href: "/notes", allowed: ALL },
      { label: "Freigaben", href: "/freigaben", allowed: MANAGER_UP },
      { label: "Alerts", href: "/alerts", allowed: MANAGER_UP },
      { label: "Automation", href: "/automation/suggestions", allowed: MANAGER_UP }
    ]
  },
  {
    label: "Einstellungen",
    items: [
      { label: "Profil", href: "/settings/profile", allowed: ALL },
      { label: "Team", href: "/settings/team", allowed: ADMIN_UP },
      { label: "Rollen", href: "/settings/roles", allowed: ADMIN_UP }
    ]
  }
];

function firstConfiguredValue(...values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).find((value): value is string => Boolean(value));
}

const buildInfo = {
  commitSha: firstConfiguredValue(
    process.env.NEXT_PUBLIC_COMMIT_SHA,
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  ) ?? "unknown",
  appEnvironment: firstConfiguredValue(
    process.env.NEXT_PUBLIC_APP_ENV,
    process.env.NEXT_PUBLIC_VERCEL_ENV
  ) ?? "local",
  apiBaseUrl: getConfiguredBackendApiBaseLabel()
};

type AppShellProps = {
  children: ReactNode;
};

// Note: a previous version of this shell contained an auto-priming hook that
// pre-warmed today's bar-refill run on every dashboard load by issuing a
// GET /bar-refill/runs/today followed (on 404) by a POST /bar-refill/runs.
// That hook has been removed intentionally: a dashboard visit must never
// implicitly create production rows. The /inventory/bar-refill page is now
// solely responsible for run creation, and only via explicit user action
// (page navigation + GET, or "Neuen Lauf starten" button).

export function AppShell({ children }: AppShellProps) {
  const { role, loading: authLoading, organizationId } = useAuth();
  const { groups, activeGroupId, activeGroupType, setActiveGroup } = useWorkspace();
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  const activeNavGroups = activeGroupType === "kitchen_storage" ? kitchenNavGroups : navGroups;

  const pageTitle = useMemo(() => {
    for (const group of activeNavGroups) {
      for (const item of group.items) {
        if (item.allowed && role && !item.allowed.includes(role)) {
          continue;
        }
        if (pathname.startsWith(item.href)) {
          return item.label;
        }
      }
    }
    return "Cockpit";
  }, [pathname, role, activeNavGroups]);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Zum Hauptinhalt springen
      </a>
      <aside className="sidebar" data-open={open}>
        <div className="sidebar-head">
          <h1>Cockpit</h1>
          <button
            aria-label="Navigation schließen"
            className="sidebar-close"
            onClick={() => setOpen(false)}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>
        {groups.length > 1 ? (
          <div className="workspace-switcher">
            <select
              aria-label="Team-Bereich wechseln"
              className="workspace-select"
              onChange={(e) => setActiveGroup(e.target.value)}
              value={activeGroupId ?? ""}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        ) : null}
        {activeNavGroups.map((group, groupIdx) => (
          <section className="nav-group" key={group.label ?? `group-${groupIdx}`}>
            {group.label ? <p className="nav-label">{group.label}</p> : null}
            {group.items.map((item) => {
              if (item.allowed && (!role || !item.allowed.includes(role))) {
                return null;
              }

              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <a
                  className={`nav-link${active ? " active" : ""}`}
                  href={item.href}
                  key={item.href}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </a>
              );
            })}
          </section>
        ))}

        <div className="sidebar-foot">
          <button
            aria-label={theme === "dark" ? "Light Mode aktivieren" : "Dark Mode aktivieren"}
            className="btn sidebar-theme-toggle"
            onClick={toggleTheme}
            type="button"
          >
            <span aria-hidden="true">{theme === "dark" ? <SunIcon /> : <MoonIcon />}</span>
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            className="btn sidebar-logout-btn"
            onClick={handleLogout}
            type="button"
          >
            <span aria-hidden="true"><LogoutIcon /></span>
            Abmelden
          </button>
          <dl className="build-indicator" aria-label="Build-Informationen">
            <div>
              <dt>Commit</dt>
              <dd>{buildInfo.commitSha.slice(0, 12)}</dd>
            </div>
            <div>
              <dt>Env</dt>
              <dd>{buildInfo.appEnvironment}</dd>
            </div>
            <div>
              <dt>API</dt>
              <dd title={buildInfo.apiBaseUrl}>{buildInfo.apiBaseUrl}</dd>
            </div>
          </dl>
        </div>
      </aside>

      {open ? (
        <button
          aria-label="Navigation schließen"
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          type="button"
        />
      ) : null}

      <div className="main-column">
        <header className="topbar">
          <button
            aria-label="Navigation öffnen"
            className="hamburger-btn mobile-only"
            onClick={() => setOpen(true)}
            type="button"
          >
            <HamburgerIcon />
          </button>
          <strong>{pageTitle}</strong>
          <button
            aria-label={theme === "dark" ? "Light Mode aktivieren" : "Dark Mode aktivieren"}
            className="topbar-theme-toggle"
            onClick={toggleTheme}
            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
            type="button"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          {groups.length > 1 ? (
            <div className="topbar-actions desktop-only">
              <select
                aria-label="Team-Bereich wechseln"
                className="workspace-select"
                onChange={(e) => setActiveGroup(e.target.value)}
                value={activeGroupId ?? ""}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          ) : null}
        </header>
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
      </div>

      <BottomNav />
      <QuickNotesFab />
    </div>
  );
}
