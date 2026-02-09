import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for admin access
const supabaseUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzNTIxNSwiZXhwIjoyMDg1ODExMjE1fQ.tlEny3k81W_cM5UNGy-1Cb-ff4AjMH_ykXKhC0CUd3A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runSetup() {
  console.log('🚀 Setting up test products for TechHub Electronics...\n');

  try {
    // Step 1: Get TechHub Electronics seller ID
    console.log('📍 Finding TechHub Electronics seller...');
    const { data: sellers, error: sellerError } = await supabase
      .from('sellers')
      .select('id, store_name, approval_status')
      .eq('store_name', 'TechHub Electronics')
      .single();

    if (sellerError || !sellers) {
      console.error('❌ TechHub Electronics seller not found');
      console.error(sellerError);
      process.exit(1);
    }

    const sellerId = sellers.id;
    console.log(`✅ Found seller: ${sellers.store_name} (${sellerId})`);
    console.log(`   Status: ${sellers.approval_status}\n`);

    // Step 2: Get or create Electronics category
    console.log('📦 Finding Electronics category...');
    let categoryId;
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, name')
      .or('name.eq.Electronics,slug.eq.electronics')
      .limit(1)
      .single();

    if (catError || !categories) {
      console.log('   Creating Electronics category...');
      const { data: newCat, error: createError } = await supabase
        .from('categories')
        .insert({ name: 'Electronics', slug: 'electronics', description: 'Electronic devices and gadgets', sort_order: 1 })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating category:', createError);
        process.exit(1);
      }
      categoryId = newCat.id;
      console.log(`✅ Created category: ${newCat.name} (${categoryId})\n`);
    } else {
      categoryId = categories.id;
      console.log(`✅ Found category: ${categories.name} (${categoryId})\n`);
    }

    // Step 3: Create Product 1 - Mouse with Color + Size variants
    console.log('🖱️  Creating Product 1: Wireless Gaming Mouse (Color + Size variants)...');
    const { data: product1, error: p1Error } = await supabase
      .from('products')
      .insert({
        name: 'Wireless Gaming Mouse Pro',
        description: `High-precision wireless gaming mouse with customizable RGB lighting.

Features:
• 16,000 DPI sensor
• 11 programmable buttons
• 70-hour battery life
• Ergonomic design for long gaming sessions
• Compatible with PC and Mac`,
        category_id: categoryId,
        brand: 'TechPro',
        sku: 'THP-MOUSE-001',
        price: 1299.00,
        seller_id: sellerId,
        approval_status: 'approved',
        variant_label_1: 'Color',
        variant_label_2: 'Size',
        specifications: {
          sensor: '16000 DPI',
          battery: '70 hours',
          buttons: 11,
          weight: '120g',
          connectivity: '2.4GHz Wireless'
        },
        is_free_shipping: true
      })
      .select()
      .single();

    if (p1Error) {
      console.error('❌ Error creating Product 1:', p1Error);
    } else {
      console.log(`✅ Created: ${product1.name} (${product1.id})`);

      // Add images
      await supabase.from('product_images').insert([
        { product_id: product1.id, image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800', alt_text: 'Wireless Gaming Mouse - Main View', sort_order: 0, is_primary: true },
        { product_id: product1.id, image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800', alt_text: 'Wireless Gaming Mouse - Side View', sort_order: 1, is_primary: false },
        { product_id: product1.id, image_url: 'https://images.unsplash.com/photo-1586920740099-e4c51a9bb51d?w=800', alt_text: 'Wireless Gaming Mouse - RGB Lighting', sort_order: 2, is_primary: false }
      ]);

      // Add variants
      await supabase.from('product_variants').insert([
        { product_id: product1.id, sku: 'THP-MOUSE-001-BLK-S', variant_name: 'Black / Small', color: 'Black', size: 'Small', price: 1199.00, stock: 15 },
        { product_id: product1.id, sku: 'THP-MOUSE-001-BLK-M', variant_name: 'Black / Medium', color: 'Black', size: 'Medium', price: 1299.00, stock: 25 },
        { product_id: product1.id, sku: 'THP-MOUSE-001-BLK-L', variant_name: 'Black / Large', color: 'Black', size: 'Large', price: 1399.00, stock: 8 },
        { product_id: product1.id, sku: 'THP-MOUSE-001-WHT-S', variant_name: 'White / Small', color: 'White', size: 'Small', price: 1299.00, stock: 12 },
        { product_id: product1.id, sku: 'THP-MOUSE-001-WHT-M', variant_name: 'White / Medium', color: 'White', size: 'Medium', price: 1399.00, stock: 20 },
        { product_id: product1.id, sku: 'THP-MOUSE-001-WHT-L', variant_name: 'White / Large', color: 'White', size: 'Large', price: 1499.00, stock: 3 }
      ]);
      console.log('   ✓ Added 3 images and 6 variants (2 colors × 3 sizes)\n');
    }

    // Step 4: Create Product 2 - Keyboard with Color only variants
    console.log('⌨️  Creating Product 2: RGB Mechanical Keyboard (Color only variants)...');
    const { data: product2, error: p2Error } = await supabase
      .from('products')
      .insert({
        name: 'RGB Mechanical Gaming Keyboard',
        description: `Premium mechanical keyboard with customizable RGB per-key lighting.

Features:
• Cherry MX Blue switches
• Aluminum frame construction
• Hot-swappable switches
• PBT double-shot keycaps
• N-key rollover
• Detachable USB-C cable`,
        category_id: categoryId,
        brand: 'KeyMaster',
        sku: 'KM-KB-RGB-001',
        price: 2499.00,
        seller_id: sellerId,
        approval_status: 'approved',
        variant_label_1: 'Color',
        specifications: {
          switches: 'Cherry MX Blue',
          layout: 'Full-size (104 keys)',
          lighting: 'Per-key RGB',
          material: 'Aluminum frame',
          cable: 'Detachable USB-C'
        },
        is_free_shipping: true
      })
      .select()
      .single();

    if (p2Error) {
      console.error('❌ Error creating Product 2:', p2Error);
    } else {
      console.log(`✅ Created: ${product2.name} (${product2.id})`);

      await supabase.from('product_images').insert([
        { product_id: product2.id, image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', alt_text: 'RGB Mechanical Keyboard - Main', sort_order: 0, is_primary: true },
        { product_id: product2.id, image_url: 'https://images.unsplash.com/photo-1601445638532-3c6f6c9aa1d6?w=800', alt_text: 'RGB Mechanical Keyboard - Lighting', sort_order: 1, is_primary: false },
        { product_id: product2.id, image_url: 'https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=800', alt_text: 'RGB Mechanical Keyboard - Side View', sort_order: 2, is_primary: false }
      ]);

      await supabase.from('product_variants').insert([
        { product_id: product2.id, sku: 'KM-KB-RGB-001-BLK', variant_name: 'Black Edition', color: 'Black', price: 2499.00, stock: 30 },
        { product_id: product2.id, sku: 'KM-KB-RGB-001-WHT', variant_name: 'White Edition', color: 'White', price: 2699.00, stock: 18 },
        { product_id: product2.id, sku: 'KM-KB-RGB-001-RED', variant_name: 'Red Edition', color: 'Red', price: 2899.00, stock: 10 },
        { product_id: product2.id, sku: 'KM-KB-RGB-001-BLU', variant_name: 'Blue Limited Edition', color: 'Blue', price: 3199.00, stock: 5 }
      ]);
      console.log('   ✓ Added 3 images and 4 color variants\n');
    }

    // Step 5: Create Product 3 - Headset with Size only variants
    console.log('🎧 Creating Product 3: Gaming Headset (Size only variants)...');
    const { data: product3, error: p3Error } = await supabase
      .from('products')
      .insert({
        name: 'Pro Gaming Headset 7.1 Surround',
        description: `Professional gaming headset with 7.1 virtual surround sound.

Features:
• 50mm dynamic drivers
• Noise-canceling microphone
• Memory foam ear cushions
• 3.5mm jack + USB adapter
• Compatible with PC, PS5, Xbox, Nintendo Switch
• Lightweight aluminum frame`,
        category_id: categoryId,
        brand: 'SoundWave',
        sku: 'SW-HS-PRO-001',
        price: 1899.00,
        seller_id: sellerId,
        approval_status: 'approved',
        variant_label_1: 'Size',
        specifications: {
          drivers: '50mm',
          surround: '7.1 Virtual',
          mic: 'Noise-canceling',
          connectivity: '3.5mm + USB',
          weight: '280g'
        },
        is_free_shipping: false
      })
      .select()
      .single();

    if (p3Error) {
      console.error('❌ Error creating Product 3:', p3Error);
    } else {
      console.log(`✅ Created: ${product3.name} (${product3.id})`);

      await supabase.from('product_images').insert([
        { product_id: product3.id, image_url: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcf?w=800', alt_text: 'Gaming Headset - Main View', sort_order: 0, is_primary: true },
        { product_id: product3.id, image_url: 'https://images.unsplash.com/photo-1545127398-14699f92334b?w=800', alt_text: 'Gaming Headset - Side View', sort_order: 1, is_primary: false },
        { product_id: product3.id, image_url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=800', alt_text: 'Gaming Headset - Microphone Detail', sort_order: 2, is_primary: false }
      ]);

      await supabase.from('product_variants').insert([
        { product_id: product3.id, sku: 'SW-HS-PRO-001-STD', variant_name: 'Standard Fit', size: 'Standard', price: 1899.00, stock: 40 },
        { product_id: product3.id, sku: 'SW-HS-PRO-001-LRG', variant_name: 'Large Fit (Premium Padding)', size: 'Large', price: 2199.00, stock: 22 },
        { product_id: product3.id, sku: 'SW-HS-PRO-001-XL', variant_name: 'XL Fit (Max Comfort)', size: 'XL', price: 2499.00, stock: 7 }
      ]);
      console.log('   ✓ Added 3 images and 3 size variants\n');
    }

    // Step 6: Create Product 4 - USB-C Hub with no variants
    console.log('🔌 Creating Product 4: USB-C Hub (No variants)...');
    const { data: product4, error: p4Error } = await supabase
      .from('products')
      .insert({
        name: '7-in-1 USB-C Hub Adapter',
        description: `Premium USB-C hub with multiple ports for enhanced connectivity.

Ports:
• 1x HDMI 4K@60Hz
• 2x USB 3.0 (5Gbps)
• 1x USB-C PD (100W charging)
• 1x SD card reader
• 1x Micro SD card reader
• 1x Ethernet (Gigabit)

Compatible with MacBooks, Dell XPS, Surface, and more.`,
        category_id: categoryId,
        brand: 'ConnectPro',
        sku: 'CP-HUB-7IN1-001',
        price: 899.00,
        seller_id: sellerId,
        approval_status: 'approved',
        specifications: {
          ports: 7,
          hdmi: '4K@60Hz',
          usb: 'USB 3.0 5Gbps',
          pd: '100W',
          ethernet: 'Gigabit',
          material: 'Aluminum'
        },
        is_free_shipping: true
      })
      .select()
      .single();

    if (p4Error) {
      console.error('❌ Error creating Product 4:', p4Error);
    } else {
      console.log(`✅ Created: ${product4.name} (${product4.id})`);

      await supabase.from('product_images').insert([
        { product_id: product4.id, image_url: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=800', alt_text: 'USB-C Hub - Main View', sort_order: 0, is_primary: true },
        { product_id: product4.id, image_url: 'https://images.unsplash.com/photo-1591370874773-6702e8f12fd8?w=800', alt_text: 'USB-C Hub - All Ports', sort_order: 1, is_primary: false },
        { product_id: product4.id, image_url: 'https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=800', alt_text: 'USB-C Hub - Connected Setup', sort_order: 2, is_primary: false }
      ]);

      await supabase.from('product_variants').insert([
        { product_id: product4.id, sku: 'CP-HUB-7IN1-001-STD', variant_name: 'Standard', price: 899.00, stock: 50 }
      ]);
      console.log('   ✓ Added 3 images and 1 variant (standard)\n');
    }

    console.log('✅ All test products created successfully!\n');
    console.log('📊 Summary:');
    console.log('   • Product 1: Wireless Gaming Mouse (6 variants: 2 colors × 3 sizes)');
    console.log('   • Product 2: RGB Keyboard (4 color variants)');
    console.log('   • Product 3: Gaming Headset (3 size variants)');
    console.log('   • Product 4: USB-C Hub (no variants)');
    console.log('\n🎯 All products are approved and ready for testing!');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

runSetup();
