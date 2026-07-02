import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260531132000_harden_user_profile_rls/migration.sql"
  ),
  "utf8"
);

const variableConflictMigration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260626170000_fix_profile_upsert_rpc_variable_conflict/migration.sql"
  ),
  "utf8"
);

describe("profile upsert RLS hardening", () => {
  it("moves the profile repair helper into a private schema and keeps the public RPC invoker-scoped", () => {
    expect(migration).toContain("CREATE SCHEMA IF NOT EXISTS private;");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION private.can_read_user_profile");
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.upsert_current_user_profile");
    expect(migration).toContain("SECURITY INVOKER");
    expect(migration).toContain("auth.jwt() ->> 'email'");
    expect(migration).not.toContain("FROM auth.users");
  });

  it("defines row-scoped profile policies for select, insert, and update", () => {
    expect(migration).toContain('CREATE POLICY "user_profile_self_or_org_select"');
    expect(migration).toContain('CREATE POLICY "user_profile_self_insert"');
    expect(migration).toContain('CREATE POLICY "user_profile_self_update"');
    expect(migration).toContain('private.can_read_user_profile("authUserId")');
    expect(migration).toContain('WITH CHECK ((SELECT auth.uid()) = "authUserId")');
  });

  it("keeps the public profile RPC unambiguous after the null-preserving follow-up", () => {
    expect(variableConflictMigration).toContain("#variable_conflict use_column");
    expect(variableConflictMigration).toContain(
      '"displayName"                = COALESCE(EXCLUDED."displayName",                "UserProfile"."displayName")'
    );
    expect(variableConflictMigration).toContain(
      '"preferredStorageLocationId" = COALESCE(EXCLUDED."preferredStorageLocationId", "UserProfile"."preferredStorageLocationId")'
    );
    expect(variableConflictMigration).toContain('WHERE p."authUserId" = v_current_user_id');
    expect(variableConflictMigration).toContain('p."createdAt"::timestamptz');
    expect(variableConflictMigration).toContain('p."updatedAt"::timestamptz');
    expect(variableConflictMigration).not.toContain("FROM auth.users");
  });
});
