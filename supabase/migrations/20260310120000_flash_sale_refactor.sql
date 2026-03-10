-- Add a scope to discount_campaigns to distinguish between global and store-level sales
ALTER TABLE "public"."discount_campaigns" ADD COLUMN "campaign_scope" TEXT NOT NULL DEFAULT 'store';
CREATE TYPE "public"."submission_status" AS ENUM ('pending', 'approved', 'rejected');

-- Create a table for admins to define global flash sale event slots
CREATE TABLE "public"."global_flash_sale_slots" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL PRIMARY KEY,
    "name" "text" NOT NULL,
    "start_date" timestamptz NOT NULL,
    "end_date" timestamptz NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL
);

-- Create a table for sellers to submit products to global flash sales
CREATE TABLE "public"."flash_sale_submissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "slot_id" "uuid" NOT NULL REFERENCES "public"."global_flash_sale_slots"("id"),
    "seller_id" "uuid" NOT NULL REFERENCES "public"."sellers"("id"),
    "product_id" "uuid" NOT NULL REFERENCES "public"."products"("id"),
    "submitted_price" "numeric" NOT NULL,
    "submitted_stock" int NOT NULL,
    "status" "public"."submission_status" NOT NULL DEFAULT 'pending',
    "created_at" timestamptz DEFAULT now() NOT NULL
);

-- Add atomic stock management function
CREATE OR REPLACE FUNCTION "public"."decrement_stock"("p_product_id" "uuid", "quantity" int)
RETURNS "void" AS $$
BEGIN
    UPDATE "public"."products"
    SET "stock" = "stock" - "quantity"
    WHERE "id" = "p_product_id" AND "stock" >= "quantity";

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Insufficient stock for product %', "p_product_id";
    END IF;
END;
$$ LANGUAGE "plpgsql";