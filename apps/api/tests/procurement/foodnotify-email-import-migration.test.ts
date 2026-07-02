import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "prisma/migrations/20260605110000_extend_procurement_mail_imports_for_graph/migration.sql"
  ),
  "utf8"
);

describe("FoodNotify Graph mail import migration contract", () => {
  it("extends the existing procurement mail import audit table", () => {
    expect(migration).toContain('ALTER TABLE "procurement_mail_imports"');
    expect(migration).toContain('ADD COLUMN "internet_message_id" TEXT');
    expect(migration).toContain('ADD COLUMN "mailbox" TEXT');
    expect(migration).toContain('ADD COLUMN "folder" TEXT');
    expect(migration).toContain('ADD COLUMN "raw_html" TEXT');
    expect(migration).toContain('ADD COLUMN "graph_message_id" TEXT');
    expect(migration).toContain('ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP');
  });

  it("adds duplicate-detection indexes without creating a parallel FoodNotify table", () => {
    expect(migration).not.toContain('CREATE TABLE "foodnotify_email_imports"');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "procurement_mail_imports_internet_message_id_key"'
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "procurement_mail_imports_graph_message_id_key"'
    );
  });
});
