import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const action = readFileSync("../../apps/cockpit/app/(onboarding)/actions.ts", "utf8");
const migration = readFileSync(
  "prisma/migrations/20260604093000_add_create_organization_rpc/migration.sql",
  "utf8"
);

describe("organization onboarding RPC", () => {
  it("uses the deployed create organization RPC from the server action", () => {
    expect(action).toContain('supabase.rpc("create_organization_for_current_user"');
    expect(action).toContain("organization_name: organizationName");
    expect(action).not.toContain(".from(\"OrganizationMember\").insert");
  });

  it("creates a security definer RPC for authenticated users", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.create_organization_for_current_user(organization_name text)"
    );
    expect(migration).toContain("SECURITY DEFINER");
    expect(migration).toContain('INSERT INTO public."OrganizationMember"');
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.create_organization_for_current_user(text) TO authenticated;"
    );
  });
});
