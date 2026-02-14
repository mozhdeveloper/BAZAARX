// Migration script to add seller_id to support_tickets table
// Run with: node add-seller-id-migration.mjs

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
// Using service_role key for DDL operations
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjE0ODc4OSwiZXhwIjoyMDQ3NzI0Nzg5fQ.ktZ7bZZlnD_k8RJR_xH5BJcYobK8uTRMY0lsF5KjIYQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🔧 Adding seller_id column to support_tickets table...\n');

    try {
        // Read the migration file
        const migrationSQL = fs.readFileSync('./supabase-migrations/011_add_seller_id_to_support_tickets.sql', 'utf8');
        
        console.log('📄 Migration SQL:');
        console.log('─'.repeat(80));
        console.log(migrationSQL);
        console.log('─'.repeat(80) + '\n');

        // Try to check if it already exists first
        const { data: testData, error: testError } = await supabase
            .from('support_tickets')
            .select('seller_id')
            .limit(1);

        if (!testError) {
            console.log('✅ seller_id column already exists!');
            console.log('    Skipping migration.');
            return;
        }

        // Column doesn't exist, need to add it
        console.log('⚠️  seller_id column not found. Attempting to add...\n');
        console.log('Note: This requires running the SQL directly in Supabase Dashboard.');
        console.log('      Copy the migration from: supabase-migrations/011_add_seller_id_to_support_tickets.sql\n');
        
        // Alternative: If you have postgres extension, you could use it
        console.log('🔗 Supabase SQL Editor: https://supabase.com/dashboard/project/ijdpbfrcvdflzwytxncj/sql');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

runMigration().catch(console.error);
