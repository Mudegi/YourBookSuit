-- Remove unique constraint on SKU since it represents commodity category code (not unique product identifier)
-- Multiple products can share the same SKU (e.g., all computers share commodity code 44102906)
-- EFRIS distinguishes products by item_code (name/description), not commodity code

DROP INDEX IF EXISTS "Product_organizationId_sku_key";

-- Create regular index for performance (not uniqueness)
CREATE INDEX IF NOT EXISTS "Product_organizationId_sku_idx" ON "Product"("organizationId", "sku");
