// Test script for seller tickets and buyer reports
// Run with: node setup-seller-tickets-test.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupSellerTicketsTest() {
    console.log('🏪 Setting up seller ticket test data...\n');

    // Get categories
    const { data: categories, error: catError } = await supabase
        .from('ticket_categories')
        .select('id, name');

    if (catError) {
        console.error('Error fetching categories:', catError);
        return;
    }

    console.log('📋 Categories:');
    categories.forEach(c => console.log(`  - ${c.name}: ${c.id}`));

    const categoryMap = {};
    categories.forEach(c => categoryMap[c.name] = c.id);

    // Get seller profiles
    const { data: sellers } = await supabase
        .from('sellers')
        .select('id, store_name, owner_name')
        .limit(5);

    if (!sellers || sellers.length === 0) {
        console.error('No sellers found in database');
        return;
    }

    console.log('\n🏪 Sellers:');
    sellers.forEach(s => console.log(`  - ${s.store_name || s.owner_name}: ${s.id}`));

    // Get buyer profiles for buyer reports
    const { data: buyers } = await supabase
        .from('buyers')
        .select('id')
        .limit(5);

    console.log('\n👥 Buyers:', buyers?.length || 0);

    // Define seller-specific tickets
    const sellerTickets = [
        {
            user_id: sellers[0].id,
            category_id: categoryMap['Payment'],
            priority: 'urgent',
            status: 'open',
            subject: 'Weekly payout not received',
            description: 'My weekly payout was scheduled for Monday but I still haven\'t received it in my bank account. This is affecting my cash flow. Please help urgently.'
        },
        {
            user_id: sellers[0].id,
            category_id: categoryMap['General'],
            priority: 'normal',
            status: 'in_progress',
            subject: 'How to set up product variants?',
            description: 'I want to sell t-shirts in multiple sizes and colors. How do I properly set up product variants in the seller dashboard?'
        },
        {
            user_id: sellers[1]?.id || sellers[0].id,
            category_id: categoryMap['Product Quality'],
            priority: 'high',
            status: 'waiting_response',
            subject: 'Product rejected - need clarification',
            description: 'My product "Wireless Mouse Pro" was rejected with the reason "incomplete description". I\'ve added all the specifications. What else is needed?'
        },
        {
            user_id: sellers[1]?.id || sellers[0].id,
            category_id: categoryMap['Shipping'],
            priority: 'low',
            status: 'open',
            subject: 'Bulk shipping label printing',
            description: 'I have 50+ orders ready to ship. Is there a way to print all shipping labels at once instead of one by one?'
        },
        {
            user_id: sellers[2]?.id || sellers[0].id,
            category_id: categoryMap['Returns'],
            priority: 'high',
            status: 'open',
            subject: 'Buyer requesting refund without returning item',
            description: 'A buyer is demanding a refund but refuses to return the item. They claim it\'s defective but provided no proof. How should I handle this?'
        },
    ];

    // Define buyer tickets that sellers might see (Order/Product/Shipping issues)
    const buyerComplaintTickets = buyers && buyers.length > 0 ? [
        {
            user_id: buyers[0].id,
            category_id: categoryMap['Order Issue'],
            priority: 'high',
            status: 'open',
            subject: 'Order never arrived',
            description: 'I ordered a laptop from TechHub Electronics 2 weeks ago. Tracking shows delivered but I never received it. The seller is not responding to my messages.'
        },
        {
            user_id: buyers[1]?.id || buyers[0].id,
            category_id: categoryMap['Product Quality'],
            priority: 'urgent',
            status: 'in_progress',
            subject: 'Received counterfeit product',
            description: 'The designer handbag I received is clearly fake. The stitching is terrible and has no authenticity certificate. I want a full refund immediately!'
        },
        {
            user_id: buyers[2]?.id || buyers[0].id,
            category_id: categoryMap['Shipping'],
            priority: 'normal',
            status: 'open',
            subject: 'Package damaged during shipping',
            description: 'My order arrived but the box was crushed and the item inside is broken. This appears to be poor packaging by the seller.'
        },
        {
            user_id: buyers[3]?.id || buyers[0].id,
            category_id: categoryMap['Returns'],
            priority: 'high',
            status: 'waiting_response',
            subject: 'Seller refusing return request',
            description: 'I ordered wrong size and the seller is refusing my return request even though it\'s within the 7-day return window.'
        },
    ] : [];

    console.log('\n🎫 Inserting seller tickets...');
    
    let sellerTicketCount = 0;
    for (const ticket of sellerTickets) {
        const { data, error } = await supabase
            .from('support_tickets')
            .insert(ticket)
            .select('id, subject')
            .single();

        if (error) {
            console.log(`  ⚠️  ${error.message} - ${ticket.subject}`);
        } else {
            console.log(`  ✅ Seller: ${data.subject}`);
            sellerTicketCount++;
        }
    }

    console.log('\n📢 Inserting buyer complaint tickets...');
    
    let buyerTicketCount = 0;
    for (const ticket of buyerComplaintTickets) {
        const { data, error } = await supabase
            .from('support_tickets')
            .insert(ticket)
            .select('id, subject')
            .single();

        if (error) {
            console.log(`  ⚠️  ${error.message} - ${ticket.subject}`);
        } else {
            console.log(`  ✅ Buyer: ${data.subject}`);
            buyerTicketCount++;
        }
    }

    console.log(`\n✅ Setup complete! Inserted ${sellerTicketCount} seller tickets and ${buyerTicketCount} buyer complaint tickets.`);

    // Show ticket summary
    const { count: totalCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Total tickets in database: ${totalCount}`);

    // Show seller tickets
    console.log('\n📋 Seller Tickets (for /seller/my-tickets):');
    console.log('─'.repeat(90));
    
    for (const seller of sellers.slice(0, 3)) {
        const { data: sellerTickets } = await supabase
            .from('support_tickets')
            .select(`
                id,
                subject,
                status,
                priority,
                category:ticket_categories!category_id(name)
            `)
            .eq('user_id', seller.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (sellerTickets && sellerTickets.length > 0) {
            console.log(`\n🏪 ${seller.store_name || seller.owner_name} (${sellerTickets.length} tickets):`);
            sellerTickets.forEach((t) => {
                console.log(`  [${t.status.toUpperCase().padEnd(15)}] ${t.priority.padEnd(8)} | ${t.category?.name?.padEnd(20) || 'N/A'.padEnd(20)} | ${t.subject.substring(0, 40)}`);
            });
        }
    }

    // Show buyer complaint tickets (for /seller/buyer-reports)
    console.log('\n\n📢 Buyer Complaint Tickets (for /seller/buyer-reports):');
    console.log('─'.repeat(90));
    
    const { data: complaints } = await supabase
        .from('support_tickets')
        .select(`
            id,
            subject,
            status,
            priority,
            user:profiles!user_id(first_name, last_name),
            category:ticket_categories!category_id(name)
        `)
        .in('category_id', [
            categoryMap['Order Issue'],
            categoryMap['Product Quality'],
            categoryMap['Shipping'],
            categoryMap['Returns']
        ])
        .order('created_at', { ascending: false })
        .limit(10);

    if (complaints && complaints.length > 0) {
        complaints.forEach((t) => {
            const userName = [t.user?.first_name, t.user?.last_name].filter(Boolean).join(' ') || 'Unknown';
            console.log(`  [${t.status.toUpperCase().padEnd(15)}] ${t.priority.padEnd(8)} | ${userName.padEnd(20)} | ${t.subject.substring(0, 35)}`);
        });
    }

    console.log('\n\n🎉 Test data ready! Visit these pages:');
    console.log('  - http://localhost:5173/seller/help-center');
    console.log('  - http://localhost:5173/seller/my-tickets');
    console.log('  - http://localhost:5173/seller/buyer-reports');
    console.log('  - http://localhost:5173/admin/tickets (Admin can see all tickets)');
}

setupSellerTicketsTest().catch(console.error);
