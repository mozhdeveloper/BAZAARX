-- Setup perfect test products for TechHub Electronics (seller2@bazaarph.com)
-- This creates products with different variant configurations to test pricing and stock

-- First, get the seller ID and category ID
DO $$
DECLARE
  v_seller_id uuid;
  v_category_id uuid;
  v_product_id_1 uuid;
  v_product_id_2 uuid;
  v_product_id_3 uuid;
  v_product_id_4 uuid;
BEGIN
  -- Get TechHub Electronics seller ID
  SELECT id INTO v_seller_id 
  FROM sellers 
  WHERE store_name = 'TechHub Electronics';
  
  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'TechHub Electronics seller not found';
  END IF;

  -- Get Electronics category ID
  SELECT id INTO v_category_id 
  FROM categories 
  WHERE name = 'Electronics' OR slug = 'electronics'
  LIMIT 1;
  
  IF v_category_id IS NULL THEN
    -- Create Electronics category if it doesn't exist
    INSERT INTO categories (name, slug, description, sort_order)
    VALUES ('Electronics', 'electronics', 'Electronic devices and gadgets', 1)
    RETURNING id INTO v_category_id;
  END IF;

  -- ============================================================
  -- PRODUCT 1: Wireless Gaming Mouse - Both Color AND Size variants
  -- ============================================================
  INSERT INTO products (
    name, 
    description, 
    category_id, 
    brand, 
    sku,
    price,
    seller_id,
    approval_status,
    variant_label_1,
    variant_label_2,
    specifications,
    is_free_shipping
  )
  VALUES (
    'Wireless Gaming Mouse Pro',
    E'High-precision wireless gaming mouse with customizable RGB lighting.\n\nFeatures:\n• 16,000 DPI sensor\n• 11 programmable buttons\n• 70-hour battery life\n• Ergonomic design for long gaming sessions\n• Compatible with PC and Mac',
    v_category_id,
    'TechPro',
    'THP-MOUSE-001',
    1299.00,
    v_seller_id,
    'approved',
    'Color',
    'Size',
    '{"sensor": "16000 DPI", "battery": "70 hours", "buttons": 11, "weight": "120g", "connectivity": "2.4GHz Wireless"}'::jsonb,
    true
  )
  RETURNING id INTO v_product_id_1;

  -- Add images for Product 1
  INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
  VALUES 
    (v_product_id_1, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800', 'Wireless Gaming Mouse - Main View', 0, true),
    (v_product_id_1, 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800', 'Wireless Gaming Mouse - Side View', 1, false),
    (v_product_id_1, 'https://images.unsplash.com/photo-1586920740099-e4c51a9bb51d?w=800', 'Wireless Gaming Mouse - RGB Lighting', 2, false);

  -- Add variants for Product 1 (Color x Size = 6 variants)
  -- Black Small
  INSERT INTO product_variants (product_id, sku, variant_name, color, size, price, stock)
  VALUES (v_product_id_1, 'THP-MOUSE-001-BLK-S', 'Black / Small', 'Black', 'Small', 1199.00, 15);
  
  -- Black Medium
  INSERT INTO product_variants (product_id, sku, variant_name, color, size, price, stock)
  VALUES (v_product_id_1, 'THP-MOUSE-001-BLK-M', 'Black / Medium', 'Black', 'Medium', 1299.00, 25);
  
  -- Black Large
  INSERT INTO product_variants (product_id, sku, variant_name, color, size, price, stock)
  VALUES (v_product_id_1, 'THP-MOUSE-001-BLK-L', 'Black / Large', 'Black', 'Large', 1399.00, 8);
  
  -- White Small
  INSERT INTO product_variants (product_id, sku, variant_name, color, size, price, stock)
  VALUES (v_product_id_1, 'THP-MOUSE-001-WHT-S', 'White / Small', 'White', 'Small', 1299.00, 12);
  
  -- White Medium
  INSERT INTO product_variants (product_id, sku, variant_name, color, size, price, stock)
  VALUES (v_product_id_1, 'THP-MOUSE-001-WHT-M', 'White / Medium', 'White', 'Medium', 1399.00, 20);
  
  -- White Large (Low stock to test alert)
  INSERT INTO product_variants (product_id, sku, variant_name, color, size, price, stock)
  VALUES (v_product_id_1, 'THP-MOUSE-001-WHT-L', 'White / Large', 'White', 'Large', 1499.00, 3);

  -- ============================================================
  -- PRODUCT 2: Mechanical Keyboard - Color variants only
  -- ============================================================
  INSERT INTO products (
    name, 
    description, 
    category_id, 
    brand, 
    sku,
    price,
    seller_id,
    approval_status,
    variant_label_1,
    specifications,
    is_free_shipping
  )
  VALUES (
    'RGB Mechanical Gaming Keyboard',
    E'Premium mechanical keyboard with customizable RGB per-key lighting.\n\nFeatures:\n• Cherry MX Blue switches\n• Aluminum frame construction\n• Hot-swappable switches\n• PBT double-shot keycaps\n• N-key rollover\n• Detachable USB-C cable',
    v_category_id,
    'KeyMaster',
    'KM-KB-RGB-001',
    2499.00,
    v_seller_id,
    'approved',
    'Color',
    '{"switches": "Cherry MX Blue", "layout": "Full-size (104 keys)", "lighting": "Per-key RGB", "material": "Aluminum frame", "cable": "Detachable USB-C"}'::jsonb,
    true
  )
  RETURNING id INTO v_product_id_2;

  -- Add images for Product 2
  INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
  VALUES 
    (v_product_id_2, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', 'RGB Mechanical Keyboard - Main', 0, true),
    (v_product_id_2, 'https://images.unsplash.com/photo-1601445638532-3c6f6c9aa1d6?w=800', 'RGB Mechanical Keyboard - Lighting', 1, false),
    (v_product_id_2, 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800', 'RGB Mechanical Keyboard - Side View', 2, false);

  -- Add variants for Product 2 (Color only = 4 variants)
  -- Black
  INSERT INTO product_variants (product_id, sku, variant_name, color, price, stock)
  VALUES (v_product_id_2, 'KM-KB-RGB-001-BLK', 'Black Edition', 'Black', 2499.00, 30);
  
  -- White
  INSERT INTO product_variants (product_id, sku, variant_name, color, price, stock)
  VALUES (v_product_id_2, 'KM-KB-RGB-001-WHT', 'White Edition', 'White', 2699.00, 18);
  
  -- Red (Higher price, premium)
  INSERT INTO product_variants (product_id, sku, variant_name, color, price, stock)
  VALUES (v_product_id_2, 'KM-KB-RGB-001-RED', 'Red Edition', 'Red', 2899.00, 10);
  
  -- Blue (Limited edition, low stock)
  INSERT INTO product_variants (product_id, sku, variant_name, color, price, stock)
  VALUES (v_product_id_2, 'KM-KB-RGB-001-BLU', 'Blue Limited Edition', 'Blue', 3199.00, 5);

  -- ============================================================
  -- PRODUCT 3: Gaming Headset - Size variants only
  -- ============================================================
  INSERT INTO products (
    name, 
    description, 
    category_id, 
    brand, 
    sku,
    price,
    seller_id,
    approval_status,
    variant_label_1,
    specifications,
    is_free_shipping
  )
  VALUES (
    'Pro Gaming Headset 7.1 Surround',
    E'Professional gaming headset with 7.1 virtual surround sound.\n\nFeatures:\n• 50mm dynamic drivers\n• Noise-canceling microphone\n• Memory foam ear cushions\n• 3.5mm jack + USB adapter\n• Compatible with PC, PS5, Xbox, Nintendo Switch\n• Lightweight aluminum frame',
    v_category_id,
    'SoundWave',
    'SW-HS-PRO-001',
    1899.00,
    v_seller_id,
    'approved',
    'Size',
    '{"drivers": "50mm", "surround": "7.1 Virtual", "mic": "Noise-canceling", "connectivity": "3.5mm + USB", "weight": "280g"}'::jsonb,
    false
  )
  RETURNING id INTO v_product_id_3;

  -- Add images for Product 3
  INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
  VALUES 
    (v_product_id_3, 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcf?w=800', 'Gaming Headset - Main View', 0, true),
    (v_product_id_3, 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=800', 'Gaming Headset - Side View', 1, false),
    (v_product_id_3, 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800', 'Gaming Headset - Microphone Detail', 2, false);

  -- Add variants for Product 3 (Size only = 3 variants)
  -- Standard Size
  INSERT INTO product_variants (product_id, sku, variant_name, size, price, stock)
  VALUES (v_product_id_3, 'SW-HS-PRO-001-STD', 'Standard Fit', 'Standard', 1899.00, 40);
  
  -- Large Size (Better padding)
  INSERT INTO product_variants (product_id, sku, variant_name, size, price, stock)
  VALUES (v_product_id_3, 'SW-HS-PRO-001-LRG', 'Large Fit (Premium Padding)', 'Large', 2199.00, 22);
  
  -- XL Size (Maximum comfort, low stock)
  INSERT INTO product_variants (product_id, sku, variant_name, size, price, stock)
  VALUES (v_product_id_3, 'SW-HS-PRO-001-XL', 'XL Fit (Max Comfort)', 'XL', 2499.00, 7);

  -- ============================================================
  -- PRODUCT 4: USB-C Hub - No variants (single product)
  -- ============================================================
  INSERT INTO products (
    name, 
    description, 
    category_id, 
    brand, 
    sku,
    price,
    seller_id,
    approval_status,
    specifications,
    is_free_shipping
  )
  VALUES (
    '7-in-1 USB-C Hub Adapter',
    E'Premium USB-C hub with multiple ports for enhanced connectivity.\n\nPorts:\n• 1x HDMI 4K@60Hz\n• 2x USB 3.0 (5Gbps)\n• 1x USB-C PD (100W charging)\n• 1x SD card reader\n• 1x Micro SD card reader\n• 1x Ethernet (Gigabit)\n\nCompatible with MacBooks, Dell XPS, Surface, and more.',
    v_category_id,
    'ConnectPro',
    'CP-HUB-7IN1-001',
    899.00,
    v_seller_id,
    'approved',
    '{"ports": 7, "hdmi": "4K@60Hz", "usb": "USB 3.0 5Gbps", "pd": "100W", "ethernet": "Gigabit", "material": "Aluminum"}'::jsonb,
    true
  )
  RETURNING id INTO v_product_id_4;

  -- Add images for Product 4
  INSERT INTO product_images (product_id, image_url, alt_text, sort_order, is_primary)
  VALUES 
    (v_product_id_4, 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800', 'USB-C Hub - Main View', 0, true),
    (v_product_id_4, 'https://images.unsplash.com/photo-1591370874773-6702e8f12fd8?w=800', 'USB-C Hub - All Ports', 1, false),
    (v_product_id_4, 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800', 'USB-C Hub - Connected Setup', 2, false);

  -- Add variant for Product 4 (Single variant, no color/size)
  INSERT INTO product_variants (product_id, sku, variant_name, price, stock)
  VALUES (v_product_id_4, 'CP-HUB-7IN1-001-STD', 'Standard', 899.00, 50);

  RAISE NOTICE 'Successfully created 4 test products for TechHub Electronics';
  RAISE NOTICE 'Product 1: % (Color + Size variants)', v_product_id_1;
  RAISE NOTICE 'Product 2: % (Color only variants)', v_product_id_2;
  RAISE NOTICE 'Product 3: % (Size only variants)', v_product_id_3;
  RAISE NOTICE 'Product 4: % (No variants)', v_product_id_4;
END $$;
