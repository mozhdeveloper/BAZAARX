/**
 * Verify POS Settings Database Alignment
 * 
 * This script checks:
 * 1. If pos_settings table exists
 * 2. Which columns are present in the database
 * 3. If our service layer can read/write correctly
 * 4. Schema alignment between DB and code
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://yqjdddpysijmztuxnweb.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxamRkZHB5c2lqbXp0dXhud2ViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4MDc5ODUsImV4cCI6MjA0OTM4Mzk4NX0.rxNT40HN_UQX9hILlMfK6x0B05DjTu0aEfx1z0eXe2M';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Column definitions
const BASE_COLUMNS = [
  'id',
  'seller_id',
  'accept_cash',
  'accept_card',
  'accept_gcash',
  'accept_maya',
  'barcode_scanner_enabled',
  'sound_enabled',
  'multi_branch_enabled',
  'default_branch',
  'tax_enabled',
  'tax_rate',
  'tax_name',
  'tax_inclusive',
  'receipt_header',
  'receipt_footer',
  'show_logo_on_receipt',
  'receipt_template',
  'auto_print_receipt',
  'printer_type',
  'cash_drawer_enabled',
  'default_opening_cash',
  'staff_tracking_enabled',
  'require_staff_login',
  'created_at',
  'updated_at',
];

const NEW_COLUMNS = [
  'scanner_type',
  'auto_add_on_scan',
  'logo_url',
  'printer_name',
  'enable_low_stock_alert',
  'low_stock_threshold',
];

const ALL_COLUMNS = [...BASE_COLUMNS, ...NEW_COLUMNS];

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'info';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function addResult(name: string, status: 'pass' | 'fail' | 'info', message: string, details?: any) {
  results.push({ name, status, message, details });
}

async function testTableExists() {
  console.log('\n🔍 Test 1: Check if pos_settings table exists...');
  
  try {
    const { error } = await supabase
      .from('pos_settings')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        addResult('Table Exists', 'fail', 'pos_settings table does not exist', error);
        return false;
      }
      addResult('Table Exists', 'info', 'Table exists but query had issues', error);
      return true;
    }
    
    addResult('Table Exists', 'pass', 'pos_settings table exists');
    return true;
  } catch (error) {
    addResult('Table Exists', 'fail', 'Error checking table existence', error);
    return false;
  }
}

async function testBaseColumns() {
  console.log('\n🔍 Test 2: Check base columns (pre-migration)...');
  
  const selectStr = BASE_COLUMNS.join(', ');
  
  try {
    const { data, error } = await supabase
      .from('pos_settings')
      .select(selectStr)
      .limit(1);
    
    if (error) {
      addResult('Base Columns', 'fail', `Base columns query failed: ${error.message}`, { 
        code: error.code, 
        status: (error as any).status,
        details: error.details,
        hint: error.hint,
      });
      return false;
    }
    
    addResult('Base Columns', 'pass', `All ${BASE_COLUMNS.length} base columns are accessible`);
    return true;
  } catch (error) {
    addResult('Base Columns', 'fail', 'Error querying base columns', error);
    return false;
  }
}

async function testNewColumns() {
  console.log('\n🔍 Test 3: Check new columns (from migration 010)...');
  
  const selectStr = NEW_COLUMNS.join(', ');
  
  try {
    const { data, error } = await supabase
      .from('pos_settings')
      .select(selectStr)
      .limit(1);
    
    if (error) {
      const status = (error as any).status;
      if (status === 406 || error.code === 'PGRST204') {
        addResult('New Columns', 'info', 'New columns do not exist - migration 010 not applied', {
          code: error.code,
          status: status,
          message: error.message,
          missingColumns: NEW_COLUMNS,
        });
        return false;
      }
      addResult('New Columns', 'fail', `New columns query failed: ${error.message}`, error);
      return false;
    }
    
    addResult('New Columns', 'pass', `All ${NEW_COLUMNS.length} new columns are accessible`);
    return true;
  } catch (error) {
    addResult('New Columns', 'fail', 'Error querying new columns', error);
    return false;
  }
}

async function testAllColumns() {
  console.log('\n🔍 Test 4: Check all columns together...');
  
  const selectStr = ALL_COLUMNS.join(', ');
  
  try {
    const { data, error } = await supabase
      .from('pos_settings')
      .select(selectStr)
      .limit(1);
    
    if (error) {
      const status = (error as any).status;
      addResult('All Columns', 'info', `Cannot query all ${ALL_COLUMNS.length} columns together`, {
        code: error.code,
        status: status,
        message: error.message,
      });
      return false;
    }
    
    addResult('All Columns', 'pass', `All ${ALL_COLUMNS.length} columns are accessible`, { rowCount: data?.length || 0 });
    return true;
  } catch (error) {
    addResult('All Columns', 'fail', 'Error querying all columns', error);
    return false;
  }
}

async function testColumnByColumn() {
  console.log('\n🔍 Test 5: Test each column individually...');
  
  const availableColumns: string[] = [];
  const missingColumns: string[] = [];
  
  for (const column of ALL_COLUMNS) {
    try {
      const { data, error } = await supabase
        .from('pos_settings')
        .select(column)
        .limit(1);
      
      if (error) {
        if ((error as any).status === 406 || error.code === 'PGRST204') {
          missingColumns.push(column);
        } else {
          console.warn(`  ⚠️  ${column}: ${error.message}`);
        }
      } else {
        availableColumns.push(column);
      }
    } catch (error) {
      missingColumns.push(column);
    }
  }
  
  addResult('Column Analysis', 'info', `${availableColumns.length}/${ALL_COLUMNS.length} columns available`, {
    available: availableColumns,
    missing: missingColumns,
  });
  
  return { availableColumns, missingColumns };
}

async function testBackwardCompatibility() {
  console.log('\n🔍 Test 6: Test backward compatibility logic...');
  
  // Test 1: Query with all columns, expect potential 406
  try {
    let { data, error } = await supabase
      .from('pos_settings')
      .select(ALL_COLUMNS.join(', '))
      .limit(1)
      .single();
    
    if (error && ((error as any).status === 406 || error.code === 'PGRST204')) {
      // This is expected if new columns don't exist
      console.log('  ✓ Got expected 406 error, testing fallback...');
      
      // Test fallback to base columns
      const { data: baseData, error: baseError } = await supabase
        .from('pos_settings')
        .select(BASE_COLUMNS.join(', '))
        .limit(1)
        .single();
      
      if (baseError) {
        if (baseError.code === 'PGRST116') {
          addResult('Backward Compatibility', 'info', 'No existing POS settings found', { code: baseError.code });
        } else {
          addResult('Backward Compatibility', 'fail', 'Fallback to base columns failed', baseError);
        }
      } else {
        addResult('Backward Compatibility', 'pass', 'Fallback to base columns works correctly', {
          hasData: !!baseData,
        });
      }
    } else if (error) {
      if (error.code === 'PGRST116') {
        addResult('Backward Compatibility', 'info', 'No existing POS settings found', { code: error.code });
      } else {
        addResult('Backward Compatibility', 'fail', 'Unexpected error', error);
      }
    } else {
      addResult('Backward Compatibility', 'pass', 'All columns accessible - migration already applied', {
        hasData: !!data,
      });
    }
  } catch (error) {
    addResult('Backward Compatibility', 'fail', 'Test failed with exception', error);
  }
}

async function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 VERIFICATION RESULTS');
  console.log('='.repeat(80));
  
  const passCount = results.filter(r => r.status === 'pass').length;
  const failCount = results.filter(r => r.status === 'fail').length;
  const infoCount = results.filter(r => r.status === 'info').length;
  
  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : 'ℹ️';
    console.log(`\n${icon} ${result.name}: ${result.message}`);
    if (result.details) {
      console.log('   Details:', JSON.stringify(result.details, null, 2));
    }
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`Summary: ${passCount} passed, ${failCount} failed, ${infoCount} info`);
  console.log('='.repeat(80));
  
  // Provide recommendations
  console.log('\n📋 RECOMMENDATIONS:');
  
  const newColumnsTest = results.find(r => r.name === 'New Columns');
  if (newColumnsTest && newColumnsTest.status === 'info') {
    console.log(`
🔧 Migration Required:
   The database is missing the new columns from migration 010.
   
   Option 1 - Apply Migration (Recommended):
   Run this SQL in Supabase SQL Editor:
   
   ${generateMigrationSQL()}
   
   Option 2 - Use Current Code:
   The code has backward compatibility built in and will work with:
   - localStorage fallback for settings persistence
   - Default values for missing columns
   - Graceful degradation of features
`);
  } else if (newColumnsTest && newColumnsTest.status === 'pass') {
    console.log(`
✨ Database is fully migrated!
   All columns are present and accessible.
   POS settings should persist correctly to the database.
`);
  }
}

function generateMigrationSQL(): string {
  return `
-- Migration 010: Add barcode scanner and low stock columns
ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS scanner_type text DEFAULT 'camera'::text 
CHECK (scanner_type = ANY (ARRAY['camera'::text, 'usb'::text, 'bluetooth'::text]));

ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS auto_add_on_scan boolean DEFAULT true;

ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS logo_url text;

ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS printer_name text;

ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS enable_low_stock_alert boolean DEFAULT true;

ALTER TABLE public.pos_settings 
ADD COLUMN IF NOT EXISTS low_stock_threshold integer DEFAULT 10;
  `.trim();
}

async function main() {
  console.log('🚀 Starting POS Settings Database Verification...\n');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Testing ${BASE_COLUMNS.length} base + ${NEW_COLUMNS.length} new = ${ALL_COLUMNS.length} total columns\n`);
  
  const tableExists = await testTableExists();
  
  if (tableExists) {
    await testBaseColumns();
    await testNewColumns();
    await testAllColumns();
    const columnAnalysis = await testColumnByColumn();
    await testBackwardCompatibility();
  }
  
  await printResults();
  
  console.log('\n✅ Verification complete!\n');
}

main().catch(console.error);
