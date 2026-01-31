// supabase/functions/backfill-vectors/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALIBABA_API_KEY = Deno.env.get('ALIBABA_API_KEY')
const ALIBABA_URL = 'https://dashscope-intl.aliyuncs.com/api/v1/services/embeddings/multimodal-embedding/multimodal-embedding'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 1. Get all products with NO embedding (and ensure they have an image)
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, primary_image')
    .is('embedding', null)
    .not('primary_image', 'is', null)
    .limit(50) // Process 10 at a time to avoid timeouts

  if (error) {
    console.error("Supabase Query Error:", error); // This shows up in Supabase Logs
    return new Response(JSON.stringify({ 
      error: error.message, 
      details: error.details 
    }), { status: 500 });
  }
  if (!products || products.length === 0) {
    return new Response(JSON.stringify({ message: "All caught up! No empty vectors found." }), { status: 200 })
  }

  const results = []

  // 2. Loop through them and generate vectors
  for (const product of products) {
    console.log(`Processing: ${product.name}`)
    
    try {
      // Call Alibaba
      const alibabaResponse = await fetch(ALIBABA_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ALIBABA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "tongyi-embedding-vision-plus",
          input: { contents: [{ "image": product.primary_image }] }
        })
      })

      const alibabaData = await alibabaResponse.json()
      const vector = alibabaData.output?.embeddings?.[0]?.embedding || alibabaData.output?.embedding

      if (vector) {
        // Update the row
        await supabase
          .from('products')
          .update({ embedding: vector })
          .eq('id', product.id)
        
        results.push({ id: product.id, status: "Updated" })
      } else {
        results.push({ id: product.id, status: "Failed", reason: alibabaData })
      }
    } catch (err) {
      results.push({ id: product.id, status: "Error", msg: err.message })
    }
  }

  return new Response(JSON.stringify({ processed: results }), { headers: { "Content-Type": "application/json" } })
})