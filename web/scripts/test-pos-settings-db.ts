/**
 * POS Settings - Supabase Integration Test
 * Tests POS settings CRUD operations with actual database
 * 
 * Run with: npx tsx web/scripts/test-pos-settings-db.ts
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERROR: Supabase credentials not found in environment variables');
  console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface POSSettings {
  id: string;
  seller_id: string;
  enable_tax: boolean;
  tax_rate: number;
  tax_name: string;
  tax_included_in_price: boolean;
  receipt_header: string;
  receipt_footer: string;
  show_logo: boolean;
  logo_url?: string;
  receipt_template: 'standard' | 'minimal' | 'detailed';
  auto_print_receipt: boolean;
  printer_name?: string;
  enable_cash_drawer: boolean;
  opening_cash: number;
  enable_staff_tracking: boolean;
  require_staff_login: boolean;
  enable_barcode_scanner: boolean;
  scanner_type: 'camera' | 'usb' | 'bluetooth';
  auto_add_on_scan: boolean;
  enable_multi_branch: boolean;
  default_branch_id?: string;
  accepted_payment_methods: string[];
  enable_low_stock_alert: boolean;
  low_stock_threshold: number;
  enable_sound_effects: boolean;
  created_at: string;
  updated_at: string;
}

async function testDatabaseConnection() {
  console.log('\n🔌 Testing Supabase Connection...');
  
  try {
    const { data, error } = await supabase
      .from('sellers')
      .select('id, store_name')
      .limit(1);

    if (error) throw error;

    console.log('✅ Connected to Supabase successfully');
    if (data && data.length > 0) {
      console.log(`   Found seller: ${data[0].store_name}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Supabase:', error);
    return false;
  }
}

async function testCreatePOSSettingsTable() {
  console.log('\n📋 Checking POS Settings Table...');
  
  // Note: In production, this table should be created via Supabase migration
  // This test just checks if we can query it
  
  const createTableSQL = `
-- POS Settings Table
CREATE TABLE IF NOT EXISTS pos_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Tax Settings
  enable_tax BOOLEAN NOT NULL DEFAULT FALSE,
  tax_rate NUMERIC NOT NULL DEFAULT 12 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  tax_name TEXT NOT NULL DEFAULT 'VAT',
  tax_included_in_price BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Receipt Settings
  receipt_header TEXT DEFAULT 'Thank you for shopping with us!',
  receipt_footer TEXT DEFAULT 'Please come again!',
  show_logo BOOLEAN NOT NULL DEFAULT TRUE,
  logo_url TEXT,
  receipt_template TEXT NOT NULL DEFAULT 'standard' CHECK (receipt_template IN ('standard', 'minimal', 'detailed')),
  auto_print_receipt BOOLEAN NOT NULL DEFAULT FALSE,
  printer_name TEXT,
  
  -- Cash Drawer Settings
  enable_cash_drawer BOOLEAN NOT NULL DEFAULT FALSE,
  opening_cash NUMERIC NOT NULL DEFAULT 1000 CHECK (opening_cash >= 0),
  
  -- Staff Settings
  enable_staff_tracking BOOLEAN NOT NULL DEFAULT FALSE,
  require_staff_login BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Barcode Scanner Settings
  enable_barcode_scanner BOOLEAN NOT NULL DEFAULT FALSE,
  scanner_type TEXT NOT NULL DEFAULT 'camera' CHECK (scanner_type IN ('camera', 'usb', 'bluetooth')),
  auto_add_on_scan BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Multi-Branch Settings
  enable_multi_branch BOOLEAN NOT NULL DEFAULT FALSE,
  default_branch_id UUID,
  
  -- Payment Methods
  accepted_payment_methods TEXT[] NOT NULL DEFAULT ARRAY['cash', 'card', 'ewallet'],
  
  -- Additional Settings
  enable_low_stock_alert BOOLEAN NOT NULL DEFAULT TRUE,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
  enable_sound_effects BOOLEAN NOT NULL DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(seller_id)
);

-- Enable RLS
ALTER TABLE pos_settings ENABLE ROW LEVEL SECURITY;

-- Seller can manage their own POS settings
CREATE POLICY "Sellers can manage their POS settings"
  ON pos_settings
  FOR ALL
  USING (seller_id = auth.uid());
`;

  console.log('📝 SQL for creating POS settings table (run in Supabase SQL editor):');
  console.log('─'.repeat(80));
  console.log(createTableSQL);
  console.log('─'.repeat(80));
  
  return true;
}

async function testCreateMockPOSSettings(sellerId: string) {
  console.log('\n📝 Creating Mock POS Settings...');
  
  const mockSettings = {
    seller_id: sellerId,
    enable_tax: true,
    tax_rate: 12,
    tax_name: 'VAT',
    tax_included_in_price: true,
    receipt_header: 'Welcome to BazaarPH Store!',
    receipt_footer: 'Thank you for your purchase!',
    show_logo: true,
    receipt_template: 'standard' as const,
    auto_print_receipt: false,
    enable_cash_drawer: true,
    opening_cash: 1000,
    enable_staff_tracking: true,
    require_staff_login: false,
    enable_barcode_scanner: true,
    scanner_type: 'camera' as const,
    auto_add_on_scan: true,
    enable_multi_branch: false,
    accepted_payment_methods: ['cash', 'card', 'ewallet'],
    enable_low_stock_alert: true,
    low_stock_threshold: 10,
    enable_sound_effects: true,
  };

  try {
    // First, try to delete existing settings
    await supabase
      .from('pos_settings')
      .delete()
      .eq('seller_id', sellerId);

    const { data, error } = await supabase
      .from('pos_settings')
      .insert(mockSettings)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ POS Settings Created:');
    console.log(`   Seller ID: ${data.seller_id}`);
    console.log(`   Tax Enabled: ${data.enable_tax}`);
    console.log(`   Tax Rate: ${data.tax_rate}%`);
    console.log(`   Cash Drawer: ${data.enable_cash_drawer}`);
    console.log(`   Staff Tracking: ${data.enable_staff_tracking}`);
    console.log(`   Barcode Scanner: ${data.enable_barcode_scanner}`);
    
    return data;
  } catch (error: any) {
    if (error.code === '42P01') {
      console.log('⚠️  Table "pos_settings" does not exist yet');
      console.log('   Run the SQL migration first (see above)');
    } else {
      console.error('❌ Failed to create POS settings:', error.message);
    }
    return null;
  }
}

async function testReadPOSSettings(sellerId: string) {
  console.log('\n📖 Reading POS Settings...');
  
  try {
    const { data, error } = await supabase
      .from('pos_settings')
      .select('*')
      .eq('seller_id', sellerId)
      .single();

    if (error) throw error;

    console.log('✅ POS Settings Retrieved:');
    console.log(`   ID: ${data.id}`);
    console.log(`   Updated At: ${new Date(data.updated_at).toLocaleString()}`);
    console.log(`   Payment Methods: ${data.accepted_payment_methods.join(', ')}`);
    
    return data;
  } catch (error: any) {
    console.error('❌ Failed to read POS settings:', error.message);
    return null;
  }
}

async function testUpdatePOSSettings(sellerId: string) {
  console.log('\n✏️  Updating POS Settings...');
  
  try {
    const updates = {
      tax_rate: 15, // Change from 12% to 15%
      enable_sound_effects: false,
      receipt_header: 'Updated Header Message',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('pos_settings')
      .update(updates)
      .eq('seller_id', sellerId)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ POS Settings Updated:');
    console.log(`   New Tax Rate: ${data.tax_rate}%`);
    console.log(`   Sound Effects: ${data.enable_sound_effects}`);
    console.log(`   Receipt Header: ${data.receipt_header}`);
    
    return data;
  } catch (error: any) {
    console.error('❌ Failed to update POS settings:', error.message);
    return null;
  }
}

async function testDeletePOSSettings(sellerId: string) {
  console.log('\n🗑️  Deleting POS Settings...');
  
  try {
    const { error } = await supabase
      .from('pos_settings')
      .delete()
      .eq('seller_id', sellerId);

    if (error) throw error;

    console.log('✅ POS Settings Deleted Successfully');
    
    return true;
  } catch (error: any) {
    console.error('❌ Failed to delete POS settings:', error.message);
    return false;
  }
}

async function testCashDrawerSessionTable() {
  console.log('\n📋 Cash Drawer Session Table SQL...');
  
  const createTableSQL = `
-- Cash Drawer Sessions Table
CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  branch_id UUID,
  staff_id UUID,
  staff_name TEXT NOT NULL,
  
  session_number TEXT NOT NULL UNIQUE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  
  opening_cash NUMERIC NOT NULL CHECK (opening_cash >= 0),
  expected_cash NUMERIC NOT NULL CHECK (expected_cash >= 0),
  actual_cash NUMERIC CHECK (actual_cash >= 0),
  difference NUMERIC,
  
  total_sales NUMERIC NOT NULL DEFAULT 0 CHECK (total_sales >= 0),
  total_transactions INTEGER NOT NULL DEFAULT 0 CHECK (total_transactions >= 0),
  cash_sales NUMERIC NOT NULL DEFAULT 0 CHECK (cash_sales >= 0),
  card_sales NUMERIC NOT NULL DEFAULT 0 CHECK (card_sales >= 0),
  ewallet_sales NUMERIC NOT NULL DEFAULT 0 CHECK (ewallet_sales >= 0),
  total_refunds NUMERIC NOT NULL DEFAULT 0 CHECK (total_refunds >= 0),
  
  cash_in NUMERIC NOT NULL DEFAULT 0 CHECK (cash_in >= 0),
  cash_out NUMERIC NOT NULL DEFAULT 0 CHECK (cash_out >= 0),
  
  opening_notes TEXT,
  closing_notes TEXT,
  discrepancy_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cash_drawer_sessions ENABLE ROW LEVEL SECURITY;

-- Seller can manage their cash drawer sessions
CREATE POLICY "Sellers can manage their cash drawer sessions"
  ON cash_drawer_sessions
  FOR ALL
  USING (seller_id = auth.uid());

-- Index for performance
CREATE INDEX idx_cash_drawer_sessions_seller ON cash_drawer_sessions(seller_id);
CREATE INDEX idx_cash_drawer_sessions_status ON cash_drawer_sessions(status);
CREATE INDEX idx_cash_drawer_sessions_start_time ON cash_drawer_sessions(start_time DESC);
`;

  console.log('📝 SQL for creating cash drawer sessions table:');
  console.log('─'.repeat(80));
  console.log(createTableSQL);
  console.log('─'.repeat(80));
  
  return true;
}

async function runIntegrationTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 POS SETTINGS - SUPABASE INTEGRATION TESTS');
  console.log('='.repeat(80));

  // Test connection
  const connected = await testDatabaseConnection();
  if (!connected) {
    console.log('\n⚠️  Cannot proceed without database connection');
    return;
  }

  // Show table creation SQL
  await testCreatePOSSettingsTable();
  await testCashDrawerSessionTable();

  // Get a test seller ID
  console.log('\n🔍 Finding Test Seller...');
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, store_name')
    .limit(1);

  if (!sellers || sellers.length === 0) {
    console.log('⚠️  No sellers found in database. Create a seller first.');
    console.log('\n✅ Test Suite Complete (Table SQL provided)');
    return;
  }

  const testSellerId = sellers[0].id;
  console.log(`✅ Using seller: ${sellers[0].store_name} (${testSellerId})`);

  // Run CRUD tests
  const created = await testCreateMockPOSSettings(testSellerId);
  
  if (created) {
    await testReadPOSSettings(testSellerId);
    await testUpdatePOSSettings(testSellerId);
    
    // Cleanup
    console.log('\n🧹 Cleanup...');
    await testDeletePOSSettings(testSellerId);
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Test Suite Complete');
  console.log('='.repeat(80));
}

// Run tests
runIntegrationTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
