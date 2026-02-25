// Test script to insert buyer tickets about specific stores (with seller_id)
// Run with: node setup-buyer-store-tickets.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBuyerStoreTickets() {
    console.log('🎫 Setting up buyer tickets about specific stores...\n');

    // First, check if migration has been run
    const { error: columnCheckError } = await supabase
        .from('support_tickets')
        .select('seller_id')
        .limit(1);

    if (columnCheckError) {
        console.log('⚠️  seller_id column does not exist yet!');
        console.log('Please run the migration first:');
        console.log('   Copy the SQL from: supabase-migrations/011_add_seller_id_to_support_tickets.sql');
        console.log('   And run it in Supabase SQL Editor\n');
        return;
    }

    console.log('✅ seller_id column exists, proceeding...\n');

    // Get buyers
    const { data: buyers, error: buyersError } = await supabase
        .from('buyers')
        .select('id, user_id')
        .limit(5);

    if (buyersError || !buyers || buyers.length === 0) {
        console.error('❌ Error fetching buyers:', buyersError);
        return;
    }

    // Get profiles for buyers
    const buyerUserIds = buyers.map(b => b.user_id);
    const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', buyerUserIds);

    if (profilesError || !profiles) {
        console.error('❌ Error fetching profiles:', profilesError);
        return;
    }

    // Get sellers
    const { data: sellers, error: sellersError } = await supabase
        .from('sellers')
        .select('id, store_name, owner_name')
        .limit(5);

    if (sellersError || !sellers || sellers.length === 0) {
        console.error('❌ Error fetching sellers:', sellersError);
        return;
    }

    console.log(`📊 Found ${buyers.length} buyers and ${sellers.length} sellers\n`);

    // Get categories
    const { data: categories, error: catError } = await supabase
        .from('ticket_categories')
        .select('id, name');

    if (catError || !categories) {
        console.error('❌ Error fetching categories:', catError);
        return;
    }

    const categoryMap = {};
    categories.forEach(c => {
        categoryMap[c.name] = c.id;
    });

    // Create buyer tickets about specific sellers
    const buyerStoreTickets = [
        {
            user_id: profiles[0]?.id,
            seller_id: sellers[0]?.id,
            category_id: categoryMap['Product Quality'],
            priority: 'high',
            status: 'open',
            subject: `Received damaged product from ${sellers[0]?.store_name || 'store'}`,
            description: `I ordered a product from ${sellers[0]?.store_name || 'this store'} and it arrived damaged. The box was intact, but the item inside had scratches and dents. I would like a replacement or refund.`
        },
        {
            user_id: profiles[1]?.id,
            seller_id: sellers[0]?.id,
            category_id: categoryMap['Shipping'],
            priority: 'normal',
            status: 'open',
            subject: `Late delivery from ${sellers[0]?.store_name || 'store'}`,
            description: `My order from ${sellers[0]?.store_name || 'this store'} was supposed to arrive 5 days ago but still hasn't shipped. Can you help me track this?`
        },
        {
            user_id: profiles[2]?.id,
            seller_id: sellers[1]?.id,
            category_id: categoryMap['Order Issue'],
            priority: 'urgent',
            status: 'in_progress',
            subject: `Wrong item sent by ${sellers[1]?.store_name || 'store'}`,
            description: `I ordered size M blue shirt from ${sellers[1]?.store_name || 'this store'} but received size L red shirt instead. Need exchange ASAP.`
        },
        {
            user_id: profiles[0]?.id,
            seller_id: sellers[1]?.id,
            category_id: categoryMap['Returns'],
            priority: 'normal',
            status: 'open',
            subject: `Seller refusing return for defective item`,
            description: `${sellers[1]?.store_name || 'This seller'} is refusing my return request even though the product stopped working within 3 days. The return policy says 7 days for defective items.`
        },
        {
            user_id: profiles[3]?.id,
            seller_id: sellers[2]?.id,
            category_id: categoryMap['Product Quality'],
            priority: 'high',
            status: 'open',
            subject: `Product from ${sellers[2]?.store_name || 'store'} not as described`,
            description: `The listing from ${sellers[2]?.store_name || 'this store'} said "brand new" but I received a clearly used item with wear marks. This is misleading advertising.`
        },
        {
            user_id: profiles[1]?.id,
            seller_id: sellers[2]?.id,
            category_id: categoryMap['Order Issue'],
            priority: 'normal',
            status: 'resolved',
            subject: `Missing items in order from ${sellers[2]?.store_name || 'store'}`,
            description: `I ordered 3 items from ${sellers[2]?.store_name || 'this store'} but only received 2. One item is missing from the package. (Resolved: seller sent missing item)`
        },
        {
            user_id: profiles[2]?.id,
            seller_id: sellers[3]?.id,
            category_id: categoryMap['Product Quality'],
            priority: 'urgent',
            status: 'in_progress',
            subject: `Counterfeit product from ${sellers[3]?.store_name || 'store'}`,
            description: `The product I received from ${sellers[3]?.store_name || 'this store'} appears to be counterfeit. It has misspellings on the packaging and doesn't match the authentic version.`
        },
        {
            user_id: profiles[4]?.id,
            seller_id: sellers[3]?.id,
            category_id: categoryMap['Shipping'],
            priority: 'low',
            status: 'open',
            subject: `Package from ${sellers[3]?.store_name || 'store'} lost in transit`,
            description: `Tracking shows my order from ${sellers[3]?.store_name || 'this store'} is lost. Last update was 10 days ago. Need help getting refund or resend.`
        },
        {
            user_id: profiles[0]?.id,
            seller_id: sellers[4]?.id,
            category_id: categoryMap['Order Issue'],
            priority: 'high',
            status: 'open',
            subject: `Seller ${sellers[4]?.store_name || ''} not responding to messages`,
            description: `I've sent 3 messages to ${sellers[4]?.store_name || 'this seller'} about my order issue but got no response for 5 days. Really frustrated with the lack of communication.`
        },
        {
            user_id: profiles[3]?.id,
            seller_id: sellers[4]?.id,
            category_id: categoryMap['Returns'],
            priority: 'normal',
            status: 'resolved',
            subject: `Successful return to ${sellers[4]?.store_name || 'store'}`,
            description: `I had an issue with my order from ${sellers[4]?.store_name || 'this store'} but they processed my return quickly and professionally. Great customer service! (Resolved)`
        }
    ];

    console.log('📝 Inserting buyer store tickets...\n');

    let insertedCount = 0;
    for (const ticket of buyerStoreTickets) {
        if (!ticket.user_id || !ticket.seller_id) {
            console.log('  ⚠️  Skipping: Missing user_id or seller_id');
            continue;
        }

        const { data, error } = await supabase
            .from('support_tickets')
            .insert(ticket)
            .select('id, subject, seller_id')
            .single();

        if (error) {
            console.log(`  ❌ Error: ${error.message}`);
        } else {
            const seller = sellers.find(s => s.id === ticket.seller_id);
            console.log(`  ✅ ${seller?.store_name || 'Unknown'}: ${data.subject}`);
            insertedCount++;
        }
    }

    console.log(`\n✅ Inserted ${insertedCount} buyer store-specific tickets`);

    // Show summary by seller
    console.log('\n📊 Tickets by Seller:');
    console.log('─'.repeat(90));

    for (const seller of sellers.slice(0, 5)) {
        const { data: sellerTickets, error } = await supabase
            .from('support_tickets')
            .select(`
                id,
                subject,
                status,
                priority,
                category:ticket_categories!category_id(name)
            `)
            .eq('seller_id', seller.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!error && sellerTickets && sellerTickets.length > 0) {
            console.log(`\n🏪 ${seller.store_name || seller.owner_name} (${sellerTickets.length} tickets):`);
            sellerTickets.forEach((t) => {
                console.log(`  [${t.status.toUpperCase().padEnd(15)}] ${t.priority.padEnd(8)} | ${t.category?.name?.padEnd(20) || 'N/A'.padEnd(20)} | ${t.subject.substring(0, 50)}`);
            });
        } else if (!error) {
            console.log(`\n🏪 ${seller.store_name || seller.owner_name}: No tickets`);
        }
    }

    // Total count
    const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true });

    console.log(`\n\n📊 Total support tickets in database: ${count}`);
}

setupBuyerStoreTickets().catch(console.error);
