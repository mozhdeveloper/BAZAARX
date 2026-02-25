// Test script to insert sample support tickets for buyers and sellers
// Run with: node setup-test-tickets.mjs

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ijdpbfrcvdflzwytxncj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZHBiZnJjdmRmbHp3eXR4bmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMzUyMTUsImV4cCI6MjA4NTgxMTIxNX0.slNSrIdWo-EH4lpJQRIsIw9XbhaFKXsa2nICDmVBTrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestTickets() {
    console.log('🎫 Setting up test tickets...\n');

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

    // Get some user IDs
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .limit(10);

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
        return;
    }

    console.log('\n👥 Users:');
    profiles.forEach(p => console.log(`  - ${p.first_name} ${p.last_name}: ${p.id}`));

    if (profiles.length < 2) {
        console.error('Need at least 2 users to create test tickets');
        return;
    }

    // Define test tickets
    const testTickets = [
        // Buyer tickets
        {
            user_id: profiles[0].id,
            category_id: categoryMap['Order Issue'],
            priority: 'high',
            status: 'open',
            subject: 'Order not received after 7 days',
            description: 'I placed an order last week but it still hasn\'t arrived. The tracking shows delivered but I never received the package. Please help!'
        },
        {
            user_id: profiles[0].id,
            category_id: categoryMap['Product Quality'],
            priority: 'normal',
            status: 'in_progress',
            subject: 'Product arrived damaged',
            description: 'The laptop I received has a cracked screen. I need a replacement or refund. I have photos of the damage.'
        },
        {
            user_id: profiles[1].id,
            category_id: categoryMap['Payment'],
            priority: 'urgent',
            status: 'open',
            subject: 'Double charged for my order',
            description: 'I was charged twice for my recent purchase. Please refund the duplicate charge immediately.'
        },
        {
            user_id: profiles[1].id,
            category_id: categoryMap['Returns'],
            priority: 'normal',
            status: 'resolved',
            subject: 'Return request for wrong size',
            description: 'I ordered a medium shirt but received a large. I would like to return it for the correct size.'
        },
        // Seller tickets
        {
            user_id: profiles[2]?.id || profiles[0].id,
            category_id: categoryMap['Payment'],
            priority: 'high',
            status: 'open',
            subject: 'Payout not received this week',
            description: 'My weekly payout was supposed to be deposited yesterday but I haven\'t received it. My total sales were $2,450 last week.'
        },
        {
            user_id: profiles[2]?.id || profiles[0].id,
            category_id: categoryMap['General'],
            priority: 'normal',
            status: 'waiting_response',
            subject: 'How to add product variations?',
            description: 'I want to add size and color variations to my products but I can\'t find the option in the seller dashboard. Can you help?'
        },
        {
            user_id: profiles[3]?.id || profiles[1].id,
            category_id: categoryMap['Shipping'],
            priority: 'low',
            status: 'open',
            subject: 'Need bulk shipping labels',
            description: 'I have 50 orders to ship and need to print bulk shipping labels. Is there a way to batch print them?'
        },
        {
            user_id: profiles[3]?.id || profiles[1].id,
            category_id: categoryMap['Product Quality'],
            priority: 'high',
            status: 'in_progress',
            subject: 'Counterfeit complaint on my authentic product',
            description: 'A buyer has falsely claimed my product is counterfeit. I have all the authenticity documents and supplier invoices to prove it\'s genuine. Please help resolve this.'
        }
    ];

    console.log('\n🎫 Inserting test tickets...');

    // Insert tickets one by one to avoid conflicts
    let insertedCount = 0;
    for (const ticket of testTickets) {
        const { data, error } = await supabase
            .from('support_tickets')
            .insert(ticket)
            .select('id, subject')
            .single();

        if (error) {
            if (error.code === '23505') {
                console.log(`  ⚠️  Ticket may already exist: ${ticket.subject}`);
            } else {
                console.error(`  ❌ Error inserting ticket: ${error.message}`);
            }
        } else {
            console.log(`  ✅ Created: ${data.subject}`);
            insertedCount++;

            // Add a reply to some tickets
            if (ticket.status === 'in_progress' || ticket.status === 'waiting_response') {
                const adminUser = profiles.find(p => p.email?.includes('admin')) || profiles[0];
                await supabase.from('ticket_messages').insert({
                    ticket_id: data.id,
                    sender_id: adminUser.id,
                    sender_type: 'admin',
                    message: 'Thank you for contacting us. We are looking into your issue and will get back to you within 24 hours.',
                    is_internal_note: false
                });
            }
        }
    }

    console.log(`\n✅ Setup complete! Inserted ${insertedCount} new tickets.`);

    // Show final ticket count
    const { count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true });

    console.log(`📊 Total tickets in database: ${count}`);

    // Show tickets summary
    const { data: allTickets } = await supabase
        .from('support_tickets')
        .select(`
            id,
            subject,
            status,
            priority,
            user:profiles!user_id(first_name, last_name),
            category:ticket_categories!category_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(15);

    console.log('\n📋 Recent tickets:');
    console.log('─'.repeat(80));
    allTickets?.forEach(t => {
        const userName = `${t.user?.first_name || ''} ${t.user?.last_name || ''}`.trim() || 'Unknown';
        console.log(`  [${t.status.toUpperCase().padEnd(15)}] ${t.priority.padEnd(8)} | ${userName.padEnd(20)} | ${t.subject.substring(0, 40)}`);
    });
}

setupTestTickets().catch(console.error);
