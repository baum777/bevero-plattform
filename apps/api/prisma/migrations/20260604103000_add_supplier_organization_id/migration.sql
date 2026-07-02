ALTER TABLE "Supplier"
ADD COLUMN "organization_id" TEXT;

CREATE INDEX "Supplier_organization_id_idx" ON "Supplier"("organization_id");
