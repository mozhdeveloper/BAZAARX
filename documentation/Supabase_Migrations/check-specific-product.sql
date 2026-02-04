-- Check the EXACT denim jeans product with ALL fields
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
  images,
  colors,
  sizes,
  specifications
FROM products
WHERE name ILIKE '%high-waisted%stretch%denim%'
   OR name ILIKE '%denim%jeans%'
LIMIT 3;

-- Check reviews for this product
SELECT 
  r.id,
  r.product_id,
  r.rating,
  r.comment,
  r.created_at,
  p.name as product_name
FROM reviews r
JOIN products p ON r.product_id = p.id
WHERE p.name ILIKE '%denim%jeans%'
LIMIT 10;

-- Check if stock field exists and has values
SELECT 
  id,
  name,
  stock,
  price,
  rating,
  review_count,
  sales_count
FROM products
WHERE approval_status = 'approved'
  AND stock IS NOT NULL
ORDER BY stock DESC
LIMIT 10;
