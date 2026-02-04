-- ============================================
-- Add Real Descriptions to Database Products
-- Run this to populate missing product descriptions
-- ============================================

-- Update High-Waisted Stretch Denim Jeans
UPDATE products
SET 
  description = 'Our best-selling High-Waisted Stretch Denim Jeans are here! 👖 Features: • Premium stretch denim (98% cotton, 2% spandex) • High-waisted design for a flattering silhouette • Classic 5-pocket styling • Comfortable all-day wear • Available in multiple washes. Perfect for any occasion - dress up or down!',
  specifications = jsonb_build_object(
    'Material', '98% Cotton, 2% Spandex',
    'Fit', 'High-Waisted',
    'Style', 'Stretch Denim',
    'Pockets', '5-pocket design',
    'Care', 'Machine wash cold',
    'Origin', 'Philippines'
  )
WHERE name ILIKE '%high-waisted%denim%jeans%'
  AND (description IS NULL OR description = '');

-- Update Cozy Fleece Hoodie
UPDATE products
SET 
  description = 'Stay warm and stylish with our Cozy Fleece Hoodie. Made from premium cotton-blend fleece, this unisex hoodie features a comfortable relaxed fit, adjustable drawstring hood, and kangaroo pocket. Perfect for layering or wearing on its own during cool weather.',
  specifications = jsonb_build_object(
    'Material', '80% Cotton, 20% Polyester',
    'Style', 'Pullover Hoodie',
    'Fit', 'Unisex Relaxed Fit',
    'Features', 'Drawstring hood, Kangaroo pocket',
    'Care', 'Machine wash cold',
    'Weight', '300 GSM'
  )
WHERE name ILIKE '%cozy%fleece%hoodie%'
  AND (description IS NULL OR description = '');

-- Add generic but appropriate descriptions for products missing them
UPDATE products
SET description = CASE
  -- Electronics
  WHEN category ILIKE '%electronics%' OR category ILIKE '%tech%' THEN
    'Premium quality ' || LOWER(name) || '. Features the latest technology with reliable performance. Perfect for everyday use with modern design and functionality.'
  
  -- Fashion/Clothing
  WHEN category ILIKE '%fashion%' OR category ILIKE '%clothing%' OR category ILIKE '%apparel%' THEN
    'Stylish and comfortable ' || LOWER(name) || '. Made from quality materials with attention to detail. Perfect for any occasion - dress up or down with confidence.'
  
  -- Home & Garden
  WHEN category ILIKE '%home%' OR category ILIKE '%garden%' THEN
    'Enhance your living space with this ' || LOWER(name) || '. Combines functionality with aesthetic appeal. Durable construction for long-lasting use.'
  
  -- Beauty & Health
  WHEN category ILIKE '%beauty%' OR category ILIKE '%health%' THEN
    'Premium quality ' || LOWER(name) || ' for your daily wellness routine. Carefully formulated with quality ingredients. Suitable for regular use.'
  
  -- Food & Beverages
  WHEN category ILIKE '%food%' OR category ILIKE '%beverage%' THEN
    'Delicious and quality ' || LOWER(name) || '. Made with carefully selected ingredients. Perfect for enjoying any time of day.'
  
  -- Default for others
  ELSE
    'Quality ' || LOWER(name) || ' available now. Carefully selected to meet your needs. Great value for everyday use.'
END
WHERE (description IS NULL OR description = '' OR LENGTH(TRIM(description)) = 0)
  AND approval_status = 'approved'
  AND is_active = true;

-- Verify the updates
SELECT 
  id,
  name,
  LEFT(description, 100) as description_preview,
  specifications
FROM products
WHERE name ILIKE '%denim%jeans%'
   OR name ILIKE '%fleece%hoodie%'
LIMIT 5;
