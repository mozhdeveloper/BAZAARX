import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTEyMjUzMzgsImV4cCI6MjAyNjk0NTMzOH0.YpQ3_iZz_a";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCols() {
    const { data: pdCols, error: pdErr } = await supabase.from('product_discounts').select('*').limit(1);
    const { data: dcCols, error: dcErr } = await supabase.from('discount_campaigns').select('*').limit(1);
    console.log('product_discounts:', Object.keys(pdCols?.[0] || {}), pdErr);
    console.log('discount_campaigns:', Object.keys(dcCols?.[0] || {}), dcErr);
}

checkCols();
