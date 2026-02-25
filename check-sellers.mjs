// Quick check to see sellers in database
// Run with: node check-sellers.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSellers() {
    console.log('🔍 Checking sellers in database...\n');

    const { data: sellers, error } = await supabase
        .from('sellers')
        .select('id, store_name, owner_name, approval_status')
        .order('store_name', { ascending: true });

    if (error) {
        console.error('❌ Error fetching sellers:', error);
        return;
    }

    if (!sellers || sellers.length === 0) {
        console.log('⚠️  No sellers found in database');
        return;
    }

    console.log(`✅ Found ${sellers.length} sellers:\n`);
    console.log('ID'.padEnd(38) + '| Store Name'.padEnd(30) + '| Owner'.padEnd(25) + '| Status');
    console.log('─'.repeat(120));

    sellers.forEach(seller => {
        const id = seller.id.substring(0, 8) + '...';
        const store = (seller.store_name || 'N/A').substring(0, 28);
        const owner = (seller.owner_name || 'N/A').substring(0, 23);
        const status = seller.approval_status || 'N/A';
        
        console.log(
            id.padEnd(38) + 
            `| ${store}`.padEnd(30) + 
            `| ${owner}`.padEnd(25) + 
            `| ${status}`
        );
    });

    console.log('\n📊 Summary:');
    const verified = sellers.filter(s => s.approval_status === 'verified').length;
    const pending = sellers.filter(s => s.approval_status === 'pending').length;
    const rejected = sellers.filter(s => s.approval_status === 'rejected').length;
    
    console.log(`  Verified: ${verified}`);
    console.log(`  Pending:  ${pending}`);
    console.log(`  Rejected: ${rejected}`);
}

checkSellers().catch(console.error);
