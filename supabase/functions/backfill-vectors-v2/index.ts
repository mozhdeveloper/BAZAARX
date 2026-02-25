import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const JINA_API_KEY = Deno.env.get('JINA_API_KEY')
const JINA_MODEL = 'jina-clip-v2' 

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Fetch products that STILL need an embedding
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id, 
      name,
      product_images!inner (
        image_url,
        is_primary
      )
    `)
    .is('image_embedding', null) // <-- FIX 1: Only grab ones that are empty
    .not('product_images', 'is', null)
    .limit(3) // <-- FIX 2: STRICT LIMIT of 3 per run to stay safely under 100k tokens
    
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  console.log(`Processing ${products.length} products...`)
  const results = []

  for (const product of products) {
    try {
      const primaryImg = product.product_images.find((pi: any) => pi.is_primary) || product.product_images[0]
      if (!primaryImg || !primaryImg.image_url) {
        results.push({ id: product.id, status: "Skipped", reason: "No Image URL" })
        continue
      }

      console.log(`Embedding: ${product.name}`)

      // Generate Embedding using Jina CLIP v2
      const jinaResponse = await fetch('https://api.jina.ai/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JINA_API_KEY}`
        },
        body: JSON.stringify({
          model: JINA_MODEL, 
          input: [{ image: primaryImg.image_url }] // Uses the strictly required 'image' key
        })
      })

      const jinaData = await jinaResponse.json()
      
      if (jinaData.data && jinaData.data[0]) {
        const vector = jinaData.data[0].embedding
        
        // Update the row
        const { error: updateError } = await supabase
          .from('products')
          .update({ image_embedding: vector })
          .eq('id', product.id)
        
        if (updateError) {
          results.push({ id: product.id, name: product.name, status: "FailedDB", error: updateError.message })
        } else {
          results.push({ id: product.id, name: product.name, status: "Updated" })
        }
      } else {
        results.push({ id: product.id, name: product.name, status: "FailedAPI", reason: jinaData })
      }
      
      // Gentle rate limiting
      await new Promise(r => setTimeout(r, 200))

    } catch (err: any) {
      results.push({ id: product.id, status: "Error", msg: err.message })
    }
  }

  return new Response(JSON.stringify({ 
    summary: `Processed ${results.length} items`, 
    details: results 
  }), { 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  })
})