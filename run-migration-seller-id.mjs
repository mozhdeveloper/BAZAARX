// Migration script to add seller_id to support_tickets table
// Run with: node run-migration-seller-id.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🔧 Running migration: Add seller_id to support_tickets...\n');

    try {
        // First, check if seller_id column already exists
        const { data: existingTickets, error: checkError } = await supabase
            .from('support_tickets')
            .select('seller_id')
            .limit(1);

        if (!checkError) {
            console.log('✅ seller_id column already exists in support_tickets table');
            return;
        }

        console.log('⚠️  seller_id column does not exist, attempting to add...');
        console.log('Note: Direct DDL operations require admin privileges.');
        console.log('Please run the migration SQL in Supabase SQL Editor manually:');
        console.log('\n' + '─'.repeat(80));
        console.log(`
ALTER TABLE public.support_tickets
ADD COLUMN seller_id UUID REFERENCES public.sellers(id) ON DELETE SET NULL;

CREATE INDEX idx_support_tickets_seller_id ON public.support_tickets(seller_id);

COMMENT ON COLUMN public.support_tickets.seller_id IS 'Optional seller/store that this ticket is about (for buyer complaints about specific stores)';
        `);
        console.log('─'.repeat(80) + '\n');
        
    } catch (error) {
        console.error('❌ Migration check failed:', error);
    }
}

runMigration().catch(console.error);
