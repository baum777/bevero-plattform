ALTER TABLE "procurement_mail_imports"
  ADD COLUMN "internet_message_id" TEXT,
  ADD COLUMN "mailbox" TEXT,
  ADD COLUMN "folder" TEXT,
  ADD COLUMN "raw_html" TEXT,
  ADD COLUMN "graph_message_id" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "procurement_mail_imports_internet_message_id_key"
  ON "procurement_mail_imports" ("internet_message_id")
  WHERE "internet_message_id" IS NOT NULL;

CREATE UNIQUE INDEX "procurement_mail_imports_graph_message_id_key"
  ON "procurement_mail_imports" ("graph_message_id")
  WHERE "graph_message_id" IS NOT NULL;

CREATE INDEX "procurement_mail_imports_internet_message_id_idx"
  ON "procurement_mail_imports" ("internet_message_id");

CREATE INDEX "procurement_mail_imports_graph_message_id_idx"
  ON "procurement_mail_imports" ("graph_message_id");
