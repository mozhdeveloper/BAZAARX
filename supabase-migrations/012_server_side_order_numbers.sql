-- Server-side order number generation
-- Replaces client-side Math.random() with a collision-free DB sequence

-- Create a sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 100001;

-- Function to generate a unique order number
-- Format: ORD-{YEAR}{6-digit-sequence}{random-2-chars} e.g. ORD-2026100001A7
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
  year_part TEXT;
  rand_part TEXT;
BEGIN
  seq_val := nextval('order_number_seq');
  year_part := EXTRACT(YEAR FROM NOW())::TEXT;
  -- Add 2 random alphanumeric chars for additional uniqueness
  rand_part := chr(65 + floor(random() * 26)::int) || floor(random() * 10)::text;
  RETURN 'ORD-' || year_part || lpad(seq_val::text, 6, '0') || rand_part;
END;
$$ LANGUAGE plpgsql;

-- Function to generate POS order numbers
CREATE OR REPLACE FUNCTION generate_pos_order_number()
RETURNS TEXT AS $$
DECLARE
  seq_val BIGINT;
BEGIN
  seq_val := nextval('order_number_seq');
  RETURN 'POS-' || EXTRACT(YEAR FROM NOW())::TEXT || lpad(seq_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger function: auto-set order_number if not provided or empty
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    IF NEW.order_type = 'OFFLINE' THEN
      NEW.order_number := generate_pos_order_number();
    ELSE
      NEW.order_number := generate_order_number();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (BEFORE INSERT so the generated value is returned in the response)
DROP TRIGGER IF EXISTS trg_set_order_number ON orders;
CREATE TRIGGER trg_set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();
