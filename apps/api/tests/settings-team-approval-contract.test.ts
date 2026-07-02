import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("settings team approval contract", () => {
  it("renders the registered member approval form on the team page", () => {
    const page = readRepoFile("../../apps/cockpit/app/(app)/settings/team/page.tsx");

    expect(page).toContain("RegisteredMemberApprovalForm");
    expect(page).toContain("currentRole={result.currentRole}");
    expect(page).toContain("organizationId={result.organizationId}");
  });

  it("submits confirmations through apiFetch with bearer auth and organization context", () => {
    const form = readRepoFile(
      "../../apps/cockpit/app/(app)/settings/team/registered-member-approval-form.tsx"
    );

    expect(form).toContain('apiFetch("/admin/team/members/confirm"');
    expect(form).toContain("accessToken: token");
    expect(form).toContain("organizationId");
    expect(form).toContain("requireOrganization: true");
    expect(form).toContain("currentRole === \"owner\"");
    expect(form).toContain("[\"manager\", \"staff\", \"viewer\"]");
  });

  it("creates an app-domain profile during sign-up so admins can confirm registered users by email", () => {
    const actions = readRepoFile("../../apps/cockpit/app/(auth)/actions.ts");

    expect(actions).toContain("upsert_current_user_profile");
    expect(actions).toContain("display_name: fullName");
    expect(actions).toContain('redirect("/sign-up?error=profile_failed")');
  });
});
