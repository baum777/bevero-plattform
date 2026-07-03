import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

// Guards the ADR "RLS-Strategie für Cockpit-Direktreads" (hybrid model):
// cockpit user-session reads are only allowed against tables with an
// org-scoped SELECT policy; WorkflowTask has no organization column and
// must therefore only be consumed via the backend proxy.

const migrationsDir = join(process.cwd(), "prisma/migrations");

const categoriesMigration = readFileSync(
  join(migrationsDir, "20260703050000_add_inventory_categories_select_rls/migration.sql"),
  "utf8"
);

const dashboardQuery = readFileSync(
  join(process.cwd(), "../../apps/cockpit/lib/supabase/queries/dashboard.ts"),
  "utf8"
);

const reviewTasksBackend = readFileSync(
  join(process.cwd(), "../../apps/cockpit/lib/backend/review-tasks.ts"),
  "utf8"
);

function readAllMigrationSql(): Array<{ name: string; sql: string }> {
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      try {
        return {
          name: entry.name,
          sql: readFileSync(join(migrationsDir, entry.name, "migration.sql"), "utf8")
        };
      } catch {
        return { name: entry.name, sql: "" };
      }
    });
}

describe("RLS cockpit-read contracts", () => {
  it("covers inventory_categories with an org-scoped select policy", () => {
    expect(categoriesMigration).toContain(
      'GRANT SELECT ON TABLE "inventory_categories" TO authenticated;'
    );
    expect(categoriesMigration).toContain('"inventory_categories_org_member_select"');
    expect(categoriesMigration).toContain("FOR SELECT");
    expect(categoriesMigration).toContain("TO authenticated");
    // Global template rows (organization_id IS NULL) are readable by design
    // (shared seed set, no tenant data); org rows require membership.
    expect(categoriesMigration).toContain('"organization_id" IS NULL');
    expect(categoriesMigration).toContain("OR EXISTS");
    expect(categoriesMigration).toMatch(
      /om\."organizationId" = "inventory_categories"\."organization_id"/
    );
    expect(categoriesMigration).toMatch(/FROM "OrganizationMember" AS om/);
    expect(categoriesMigration).toMatch(/om\."userId" = \(SELECT auth\.uid\(\)\)::text/);
    // select-only, tenant-scoped: no broad or write-capable grants
    expect(categoriesMigration).not.toMatch(/FOR ALL/i);
    expect(categoriesMigration).not.toMatch(/TO (anon|public)\b/i);
    expect(categoriesMigration).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL)/i);
  });

  it("never opens WorkflowTask to authenticated user sessions", () => {
    for (const migration of readAllMigrationSql()) {
      const policyBlocks = migration.sql.match(
        /CREATE POLICY[^;]*ON\s+(public\.)?"?WorkflowTask"?[^;]*;/gi
      );
      for (const block of policyBlocks ?? []) {
        expect(
          block.includes("service_role"),
          `org-blind WorkflowTask policy in ${migration.name}`
        ).toBe(true);
        expect(block).not.toMatch(/TO authenticated/i);
      }
      expect(migration.sql).not.toMatch(
        /GRANT [^;]*ON [^;]*"?WorkflowTask"?[^;]*TO authenticated/i
      );
    }
  });

  it("keeps the dashboard KPI read on the backend proxy instead of WorkflowTask", () => {
    expect(dashboardQuery).not.toContain('from("WorkflowTask")');
    expect(dashboardQuery).toContain("listReviewTasksForCurrentUser({ windowDays: days })");
    expect(dashboardQuery).toContain("alertsResult.access === \"allowed\"");
  });

  it("exposes resolvedAt and windowDays through the review-task proxy helper", () => {
    expect(reviewTasksBackend).toContain("resolvedAt: task.resolvedAt ?? null");
    expect(reviewTasksBackend).toMatch(/windowDays\?\s*:\s*number/);
    expect(reviewTasksBackend).toContain("/admin/review-tasks?windowDays=");
  });
});
