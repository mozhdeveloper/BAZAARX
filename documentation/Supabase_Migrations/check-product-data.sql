-- ============================================
-- Product Data Verification Query
-- Check what data exists for products
-- ============================================

-- 1. Check the High-Waisted Stretch Denim Jeans product
SELECT 
  id,
  name,
  description,
  price,
  original_price,
  stock,
  rating,
  review_count,
  sales_count,
  is_free_shipping,
  approval_status,
  seller_id,
  created_at
FROM products
WHERE name ILIKE '%denim%jeans%'
   OR name ILIKE '%high-waisted%'
LIMIT 5;

-- 2. Check all products with missing descriptions
SELECT 
  id,
  name,
  description,
  price,
  stock,
  rating,
  review_count
FROM products
WHERE description IS NULL 
   OR description = ''
   OR LENGTH(TRIM(description)) = 0
LIMIT 20;

-- 3. Check products with ratings but 0 reviews (inconsistent data)
SELECT 
  id,
  name,
  rating,
  review_count,
  sales_count
FROM products
WHERE (rating > 0 OR rating IS NOT NULL)
  AND (review_count = 0 OR review_count IS NULL)
LIMIT 20;

-- 4. Check specific product by seller (MariaBoutiquePH)
SELECT 
  p.id,
  p.name,
  p.description,
  p.price,
  p.original_price,
  p.stock,
  p.rating,
  p.review_count,
  p.sales_count,
  p.specifications,
  s.store_name as seller_name
FROM products p
LEFT JOIN sellers s ON p.seller_id = s.id
WHERE s.store_name ILIKE '%maria%'
   OR s.business_name ILIKE '%maria%'
LIMIT 10;

-- 5. Get summary statistics
SELECT 
  COUNT(*) as total_products,
  COUNT(description) as products_with_description,
  COUNT(*) - COUNT(description) as products_missing_description,
  AVG(rating) as avg_rating,
  AVG(review_count) as avg_review_count
FROM products
WHERE approval_status = 'approved' 
  AND is_active = true;
