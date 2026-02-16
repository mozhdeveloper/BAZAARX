-- Test script for admin tickets
-- Run this in Supabase SQL Editor to create test tickets for buyers and sellers// This script inserts test tickets for various users and categories

-- Get category IDs first (reference)
-- Order Issue: a2eb6c15-...
-- Product Quality: 1dcdf1d5-...
-- Shipping: 57feff1e-...
-- Payment: 18c97aff-...
-- Returns: 5ee63d13-...
-- General: f1be2ba2-...

-- Insert test tickets
INSERT INTO support_tickets (user_id, category_id, priority, status, subject, description, order_id)
SELECT 
    p.id as user_id,
    c.id as category_id,
    priority,
    status,
    subject,
    description,
    order_id
FROM (
    VALUES
    -- Buyer tickets
    ('5c00948e-ce3e-4fe3-a2ff-20f2e1af0fb9', 'Order Issue', 'high', 'open', 
     'Order not received after 7 days', 
     'I placed an order last week but it still hasn''t arrived. The tracking shows delivered but I never received the package. Please help!', NULL),
    
    ('5c00948e-ce3e-4fe3-a2ff-20f2e1af0fb9', 'Product Quality', 'normal', 'in_progress', 
     'Product arrived damaged', 
     'The laptop I received has a cracked screen. I need a replacement or refund. I have photos of the damage.', NULL),
    
    ('16be6e20-0bdf-47eb-8d90-78f42efc66e6', 'Payment', 'urgent', 'open', 
     'Double charged for my order', 
     'I was charged twice for my recent purchase. Please refund the duplicate charge immediately.', NULL),
    
    ('16be6e20-0bdf-47eb-8d90-78f42efc66e6', 'Returns', 'normal', 'resolved', 
     'Return request for wrong size', 
     'I ordered a medium shirt but received a large. I would like to return it for the correct size.', NULL),
    
    -- Seller tickets  
    ('50e4eb60-e224-4f06-b7b3-bb0ea780b55f', 'Payment', 'high', 'open', 
     'Payout not received this week', 
     'My weekly payout was supposed to be deposited yesterday but I haven''t received it. My total sales were $2,450 last week.', NULL),
    
    ('50e4eb60-e224-4f06-b7b3-bb0ea780b55f', 'General', 'normal', 'waiting_response', 
     'How to add product variations?', 
     'I want to add size and color variations to my products but I can''t find the option in the seller dashboard. Can you help?', NULL),
    
    ('6e83cca6-d3b6-4ed9-ab36-7f61a45b0bfd', 'Shipping', 'low', 'open', 
     'Need bulk shipping labels', 
     'I have 50 orders to ship and need to print bulk shipping labels. Is there a way to batch print them?', NULL),
    
    -- More buyer tickets
    ('6e83cca6-d3b6-4ed9-ab36-7f61a45b0bfd', 'Product Quality', 'high', 'in_progress', 
     'Fake product received', 
     'The designer bag I ordered is clearly a fake. The stitching is wrong and it doesn''t have the authenticity card. I want a full refund!', NULL)
    
) AS t(user_id_text, category_name, priority, status, subject, description, order_id)
CROSS JOIN LATERAL (
    SELECT id FROM profiles WHERE id::text = t.user_id_text
) p
CROSS JOIN LATERAL (
    SELECT id FROM ticket_categories WHERE name = t.category_name
) c
ON CONFLICT DO NOTHING;

-- Add some ticket messages/replies
INSERT INTO ticket_messages (ticket_id, sender_id, sender_type, message, is_internal_note)
SELECT 
    st.id,
    '6e83cca6-d3b6-4ed9-ab36-7f61a45b0bfd',
    'admin',
    'Thank you for contacting us. We are looking into your issue and will get back to you within 24 hours.',
    false
FROM support_tickets st
WHERE st.status IN ('in_progress', 'waiting_response')
ON CONFLICT DO NOTHING;

-- Verify inserted tickets
SELECT 
    st.id,
    p.first_name || ' ' || p.last_name as user_name,
    tc.name as category,
    st.priority,
    st.status,
    st.subject,
    st.created_at
FROM support_tickets st
LEFT JOIN profiles p ON st.user_id = p.id
LEFT JOIN ticket_categories tc ON st.category_id = tc.id
ORDER BY st.created_at DESC;
